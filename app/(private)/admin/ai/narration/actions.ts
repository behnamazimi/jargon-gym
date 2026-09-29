"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import { exactEmailPattern } from "@/lib/admin/email-lookup";
import {
  cancelNarrationSync,
  canResumeNarrationSync,
  enqueueNarrationSync,
  getLastNarrationSyncJob,
  kickNarrationSyncWorker,
  listCollectionNarrationCoverage,
} from "@/lib/narration/sync";
import { capsSchema, type CapsInput } from "@/lib/narration/caps-schema";
import {
  canNarrateCollection,
  listAllCollectionsForAdmin,
} from "@/lib/jargon/admin/list-all-collections";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

/** The admin page has one switch and one list; they apply to both narration features. */
const NARRATION_FEATURES = ["narration_term", "narration_story"] as const;

type Client = SupabaseClient<Database>;

const REVALIDATE = ["/admin", "/admin/ai", "/admin/ai/narration"];

export async function setNarrationEnabled(value: boolean) {
  return runAdminAction(
    async ({ supabase }) => {
      const { error } = await supabase.rpc("admin_set_narration_enabled", { p_enabled: value });
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

      const { error } = await supabase.from("ai_feature_allowlist").upsert(
        NARRATION_FEATURES.map((feature) => ({ feature, user_id: account.id })),
        { onConflict: "feature,user_id", ignoreDuplicates: true },
      );
      if (error) throw error;

      return { userId: account.id, email: account.email };
    },
    { revalidate: REVALIDATE },
  );
}

export async function removeFromNarrationAllowlist(userId: string) {
  return runAdminAction(
    async ({ supabase }) => {
      const { error } = await supabase
        .from("ai_feature_allowlist")
        .delete()
        .in("feature", [...NARRATION_FEATURES])
        .eq("user_id", userId);
      if (error) throw error;
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

export async function startNarrationSync(domainId: string) {
  return runAdminAction(async ({ supabase, user }) => {
    if (!(await actableCollections(supabase, user.id)).has(domainId)) {
      throw new AdminError("Collection not found.");
    }
    const job = await enqueueNarrationSync(createAdminClient(), domainId, user.id);
    kickNarrationSyncWorker();
    return job;
  });
}

export async function cancelNarrationSyncJob() {
  return runAdminAction(() => cancelNarrationSync(createAdminClient()));
}

export async function resumeNarrationSync() {
  return runAdminAction(async () => {
    const job = await getLastNarrationSyncJob(createAdminClient());
    if (!canResumeNarrationSync(job)) {
      throw new AdminError("Nothing to resume.");
    }
    kickNarrationSyncWorker();
  });
}

export async function getNarrationSyncStatus() {
  return runAdminAction(() => getLastNarrationSyncJob(createAdminClient()));
}

export async function getNarrationSyncCoverage(collections: { id: string; name: string }[]) {
  return runAdminAction(async ({ supabase, user }) => {
    const allowed = await actableCollections(supabase, user.id);
    return listCollectionNarrationCoverage(
      createAdminClient(),
      collections.flatMap((collection) => {
        const name = allowed.get(collection.id);
        return name === undefined ? [] : [{ id: collection.id, name }];
      }),
    );
  });
}
