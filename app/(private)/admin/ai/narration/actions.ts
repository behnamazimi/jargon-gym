"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import { writeAudit } from "@/lib/admin/audit";
import { exactEmailPattern } from "@/lib/admin/email-lookup";
import {
  cancelNarrationSync,
  canResumeNarrationSync,
  enqueueNarrationSync,
  getLastNarrationSyncJob,
  kickNarrationSyncWorker,
} from "@/lib/narration/sync";
import { capsSchema, type CapsInput } from "@/lib/narration/caps-schema";
import { isActiveNarrationSyncStatus } from "@/lib/narration/sync-shared";
import {
  canNarrateCollection,
  listAllCollectionsForAdmin,
} from "@/lib/admin/collections/list-all-collections";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

/** The admin page has one switch and one list; they apply to both narration features. */
const NARRATION_FEATURES = ["narration_term", "narration_story"] as const;

type Client = SupabaseClient<Database>;

const REVALIDATE = [
  "/admin",
  "/admin/ai",
  "/admin/ai/narration",
  "/admin/people",
  "/admin/people/[id]",
];

export async function setNarrationEnabled(value: boolean) {
  return runAdminAction(
    async ({ supabase }) => {
      const { error } = await supabase.rpc("admin_set_narration_enabled", { p_enabled: value });
      if (error) throw error;
    },
    { revalidate: REVALIDATE },
  );
}

export async function setNarrationProvider(provider: "murf" | "elevenlabs", value: boolean) {
  return runAdminAction(
    async ({ supabase }) => {
      const { error } = await supabase.rpc("admin_set_narration_provider", {
        p_provider: provider,
        p_enabled: value,
      });
      if (error) throw error;
    },
    { revalidate: REVALIDATE },
  );
}

export async function setNarrationCaps(input: CapsInput) {
  return runAdminAction(
    async ({ supabase }) => {
      const parsed = capsSchema.safeParse(input);
      if (!parsed.success) {
        throw new AdminError("Enter whole numbers from 1 to 1000. Stories need a cap.");
      }

      const { error } = await supabase.rpc("admin_set_narration_caps", {
        // Null means no cap for terms; the generated type doesn't allow null.
        p_term_cap: parsed.data.term as number,
        p_story_cap: parsed.data.story,
      });
      if (error) throw error;
    },
    { revalidate: REVALIDATE },
  );
}

export async function addToNarrationAllowlist(email: string) {
  return runAdminAction(
    async ({ supabase }) => {
      const { data: account, error: lookupError } = await supabase
        .from("users")
        .select("id, email")
        .ilike("email", exactEmailPattern(email))
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!account) throw new AdminError("No account found for that email.");

      const { data: already, error: membershipError } = await supabase
        .from("ai_feature_allowlist")
        .select("feature")
        .eq("user_id", account.id)
        .in("feature", [...NARRATION_FEATURES]);
      if (membershipError) throw membershipError;

      const { error } = await supabase.from("ai_feature_allowlist").upsert(
        NARRATION_FEATURES.map((feature) => ({ feature, user_id: account.id })),
        { onConflict: "feature,user_id", ignoreDuplicates: true },
      );
      if (error) throw error;

      if ((already?.length ?? 0) < NARRATION_FEATURES.length) {
        await writeAudit(supabase, {
          action: "app.narration_access",
          targetType: "user",
          targetId: account.id,
          details: { on: true },
        });
      }

      return { userId: account.id, email: account.email };
    },
    { revalidate: REVALIDATE },
  );
}

export async function removeFromNarrationAllowlist(userId: string) {
  return runAdminAction(
    async ({ supabase }) => {
      const { data: removed, error } = await supabase
        .from("ai_feature_allowlist")
        .delete()
        .in("feature", [...NARRATION_FEATURES])
        .eq("user_id", userId)
        .select("feature");
      if (error) throw error;

      if (removed?.length) {
        await writeAudit(supabase, {
          action: "app.narration_access",
          targetType: "user",
          targetId: userId,
          details: { on: false },
        });
      }
    },
    { revalidate: REVALIDATE },
  );
}

/** Narration is generated with the server's own key for every term it is asked about, so only
 *  collections an admin may act on are allowed, whatever the browser sends. */
async function actableCollections(supabase: Client, adminId: string) {
  const collections = await listAllCollectionsForAdmin(supabase, adminId);
  return new Map(collections.filter(canNarrateCollection).map((c) => [c.id, c.name] as const));
}

export async function startNarrationSync(collectionId: string) {
  return runAdminAction(async ({ supabase, user }) => {
    if (!(await actableCollections(supabase, user.id)).has(collectionId)) {
      throw new AdminError("Collection not found.");
    }
    const job = await enqueueNarrationSync(createAdminClient(), collectionId, user.id);
    kickNarrationSyncWorker();
    await writeAudit(supabase, {
      action: "app.narration_sync_start",
      targetType: "collection",
      targetId: collectionId,
      details: { job: job.id },
    });
    return job;
  });
}

export async function cancelNarrationSyncJob() {
  return runAdminAction(async ({ supabase }) => {
    const admin = createAdminClient();
    // Cancelling with nothing running returns the last job, so look first.
    const before = await getLastNarrationSyncJob(admin);
    const job = await cancelNarrationSync(admin);
    // Only when this call ended it: the job may have finished or been cancelled elsewhere meanwhile.
    if (
      before &&
      isActiveNarrationSyncStatus(before.status) &&
      job?.id === before.id &&
      job.status === "cancelled"
    ) {
      await writeAudit(supabase, {
        action: "app.narration_sync_cancel",
        targetType: "collection",
        targetId: before.collectionId,
        details: { job: before.id },
      });
    }
    return job;
  });
}

export async function resumeNarrationSync() {
  return runAdminAction(async ({ supabase }) => {
    const job = await getLastNarrationSyncJob(createAdminClient());
    if (!job || !canResumeNarrationSync(job)) {
      throw new AdminError("Nothing to resume.");
    }
    kickNarrationSyncWorker();
    await writeAudit(supabase, {
      action: "app.narration_sync_resume",
      targetType: "collection",
      targetId: job.collectionId,
      details: { job: job.id },
    });
  });
}

export async function getNarrationSyncStatus() {
  return runAdminAction(() => getLastNarrationSyncJob(createAdminClient()));
}
