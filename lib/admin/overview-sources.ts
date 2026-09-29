import type { SupabaseClient } from "@supabase/supabase-js";
import { FEATURE_IDS, type FeatureId } from "@/lib/ai/registry";
import { canResumeNarrationSync, isActiveNarrationSyncStatus } from "@/lib/narration/sync-shared";
import { getLastNarrationSyncJob } from "@/lib/narration/sync";
import { describeCron, getCronStatus } from "@/lib/narration/worker-status";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export async function readWaitlistPending(client: Client): Promise<number> {
  const { count, error } = await client
    .from("waitlist_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

export async function readCreditsEnabled(client: Client): Promise<boolean> {
  const { data, error } = await client
    .from("ai_credit_settings")
    .select("enabled")
    .eq("id", true)
    .single();
  if (error) throw error;
  return data.enabled;
}

export async function readFeaturesOff(client: Client): Promise<FeatureId[]> {
  const { data, error } = await client.from("ai_feature_settings").select("feature, enabled");
  if (error) throw error;
  return (data ?? [])
    .filter((row) => !row.enabled && (FEATURE_IDS as string[]).includes(row.feature))
    .map((row) => row.feature as FeatureId);
}

/** A stalled sync, or a cron job that has gone quiet while a sync needs it. */
export async function readSyncNote(client: Client): Promise<string | null> {
  const admin = createAdminClient();
  const job = await getLastNarrationSyncJob(admin);
  const resumable = canResumeNarrationSync(job);
  const needsCron = resumable || Boolean(job && isActiveNarrationSyncStatus(job.status));
  const cron = describeCron(await getCronStatus(client), needsCron);

  if (resumable) return "A sync has stalled. Open Narration and press Resume.";
  return cron?.warning ? cron.text : null;
}
