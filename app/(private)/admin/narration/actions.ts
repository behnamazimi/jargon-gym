"use server";

import { revalidatePath } from "next/cache";
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

export async function setNarrationEnabled(value: boolean): Promise<void> {
  const { supabase } = await requireAdminClient();

  const { error } = await supabase
    .from("narration_settings")
    .update({ enabled: value })
    .eq("id", true);
  if (error) throw error;

  revalidatePath("/admin/narration");
}

export async function addToNarrationAllowlist(
  email: string,
): Promise<{ userId: string; email: string }> {
  const { supabase, user } = await requireAdminClient();

  const { data: account, error: lookupError } = await supabase
    .from("users")
    .select("id, email")
    .ilike("email", email.trim())
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!account) throw new Error("No account found for that email.");

  const { error } = await supabase
    .from("narration_allowlist")
    .upsert({ user_id: account.id, added_by: user.id }, { onConflict: "user_id" });
  if (error) throw error;

  revalidatePath("/admin/narration");
  return { userId: account.id, email: account.email };
}

export async function removeFromNarrationAllowlist(userId: string): Promise<void> {
  const { supabase } = await requireAdminClient();

  const { error } = await supabase.from("narration_allowlist").delete().eq("user_id", userId);
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
