import type { SupabaseClient } from "@supabase/supabase-js";
import { FEATURE_IDS, type FeatureId } from "@/lib/ai/registry";
import { readRequestAttention } from "./requests/queries";
import { canResumeNarrationSync, isActiveNarrationSyncStatus } from "@/lib/narration/sync-shared";
import { getLastNarrationSyncJob } from "@/lib/narration/sync";
import { describeCron, readCronStatus } from "@/lib/narration/worker-status";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
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

/** How many collections have an open report. Admins can read every report through the policy. */
export async function readReportedCollections(client: Client): Promise<number> {
  const rows = await fetchAllRows((from, to) =>
    client
      .from("collection_reports")
      .select("id, domain_id")
      .eq("status", "open")
      .order("id")
      .range(from, to),
  );
  return new Set(rows.map((row) => row.domain_id)).size;
}

export async function readRequestsAttention(client: Client) {
  return readRequestAttention(client);
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
  return (
    (data ?? [])
      // Term evaluation has no switch: nothing reads its setting, so "off" would be a false alarm.
      .filter(
        (row) =>
          !row.enabled &&
          row.feature !== "term_evaluation" &&
          (FEATURE_IDS as string[]).includes(row.feature),
      )
      .map((row) => row.feature as FeatureId)
  );
}

/** A stalled sync, or a cron job that has gone quiet while a sync needs it. */
export async function readSyncNote(client: Client): Promise<string | null> {
  const admin = createAdminClient();
  const job = await getLastNarrationSyncJob(admin);
  const resumable = canResumeNarrationSync(job);
  const needsCron = resumable || Boolean(job && isActiveNarrationSyncStatus(job.status));
  const cron = describeCron(await readCronStatus(client), needsCron);

  if (resumable) return "A sync has stalled. Open Narration and press Resume.";
  return cron?.warning ? cron.text : null;
}
