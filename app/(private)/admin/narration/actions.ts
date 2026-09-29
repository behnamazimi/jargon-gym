"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminClient } from "@/lib/auth/require-session";
import {
  cancelNarrationSync,
  canResumeNarrationSync,
  enqueueNarrationSync,
  getLastNarrationSyncJob,
  kickNarrationSyncWorker,
  listCollectionNarrationCoverage,
  type CollectionNarrationCoverage,
  type NarrationSyncJobView,
} from "@/lib/narration/sync";
import { createAdminClient } from "@/lib/supabase/admin";

/** The admin page has one switch and one list; they apply to both narration features. */
const NARRATION_FEATURES = ["narration_term", "narration_story"] as const;

export async function setNarrationEnabled(value: boolean): Promise<void> {
  const { supabase } = await requireAdminClient();

  const { data, error } = await supabase
    .from("ai_feature_settings")
    .update({ enabled: value })
    .in("feature", [...NARRATION_FEATURES])
    .select("feature");
  if (error) throw error;
  if (data?.length !== NARRATION_FEATURES.length) throw new Error("Couldn't change the switch.");

  revalidatePath("/admin/narration");
}

const capsSchema = z.object({
  // Blank (null) means no cap for terms; stories always keep a cap, since it is their only cost bound.
  term: z.number().int().min(1).max(1000).nullable(),
  story: z.number().int().min(1).max(1000),
});

export async function setNarrationCaps(input: {
  term: number | null;
  story: number;
}): Promise<{ error?: string }> {
  const { supabase } = await requireAdminClient();

  const parsed = capsSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter whole numbers from 1 to 1000. Stories need a cap." };

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
    if (data?.length !== 1) return { error: "Couldn't save the caps." };
  }

  revalidatePath("/admin/narration");
  return {};
}

export async function addToNarrationAllowlist(
  email: string,
): Promise<{ userId: string; email: string }> {
  const { supabase } = await requireAdminClient();

  const { data: account, error: lookupError } = await supabase
    .from("users")
    .select("id, email")
    .ilike("email", email.trim())
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!account) throw new Error("No account found for that email.");

  const { error } = await supabase.from("ai_feature_allowlist").upsert(
    NARRATION_FEATURES.map((feature) => ({ feature, user_id: account.id })),
    { onConflict: "feature,user_id", ignoreDuplicates: true },
  );
  if (error) throw error;

  revalidatePath("/admin/narration");
  return { userId: account.id, email: account.email };
}

export async function removeFromNarrationAllowlist(userId: string): Promise<void> {
  const { supabase } = await requireAdminClient();

  const { error } = await supabase
    .from("ai_feature_allowlist")
    .delete()
    .in("feature", [...NARRATION_FEATURES])
    .eq("user_id", userId);
  if (error) throw error;

  revalidatePath("/admin/narration");
}

export async function startNarrationSync(domainId: string): Promise<NarrationSyncJobView> {
  const { user } = await requireAdminClient();
  const job = await enqueueNarrationSync(createAdminClient(), domainId, user.id);
  kickNarrationSyncWorker();
  return job;
}

export async function cancelNarrationSyncJob(): Promise<NarrationSyncJobView | null> {
  await requireAdminClient();
  return cancelNarrationSync(createAdminClient());
}

export async function resumeNarrationSync(): Promise<void> {
  await requireAdminClient();
  const job = await getLastNarrationSyncJob(createAdminClient());
  if (!canResumeNarrationSync(job)) {
    throw new Error("Nothing to resume.");
  }
  kickNarrationSyncWorker();
}

export async function getNarrationSyncStatus(): Promise<NarrationSyncJobView | null> {
  await requireAdminClient();
  return getLastNarrationSyncJob(createAdminClient());
}

export async function getNarrationSyncCoverage(
  collections: { id: string; name: string }[],
): Promise<CollectionNarrationCoverage[]> {
  await requireAdminClient();
  return listCollectionNarrationCoverage(createAdminClient(), collections);
}
