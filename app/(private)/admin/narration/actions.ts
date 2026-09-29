"use server";

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
import { createAdminClient } from "@/lib/supabase/admin";

/** The admin page has one switch and one list; they apply to both narration features. */
const NARRATION_FEATURES = ["narration_term", "narration_story"] as const;

const REVALIDATE = ["/admin/narration"];

export async function setNarrationEnabled(value: boolean) {
  return runAdminAction(
    async ({ supabase }) => {
      const { data, error } = await supabase
        .from("ai_feature_settings")
        .update({ enabled: value })
        .in("feature", [...NARRATION_FEATURES])
        .select("feature");
      if (error) throw error;
      if (data?.length !== NARRATION_FEATURES.length) {
        throw new AdminError("Couldn't change the switch.");
      }
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

      const updates = [
        { feature: "narration_term", dailyCap: parsed.data.term },
        { feature: "narration_story", dailyCap: parsed.data.story },
      ];
      for (const update of updates) {
        const { data, error } = await supabase
          .from("ai_feature_settings")
          .update({ daily_cap: update.dailyCap })
          .eq("feature", update.feature)
          .select("feature");
        if (error) throw error;
        if (data?.length !== 1) throw new AdminError("Couldn't save the caps.");
      }
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

export async function startNarrationSync(domainId: string) {
  return runAdminAction(async ({ user }) => {
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
  return runAdminAction(() => listCollectionNarrationCoverage(createAdminClient(), collections));
}
