import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getInternalApiSecret } from "@/lib/auth/internal-api";
import { getPublicBaseUrl } from "@/lib/seo/base-url";
import type { Database } from "@/lib/supabase/database.types";
import { getOrGenerateNarration } from "./service";
import { isActiveNarrationSyncStatus, NARRATION_SYNC_ACTIVE_STATUSES } from "./sync-shared";

type AdminClient = SupabaseClient<Database>;
type ClaimedTick = { job_id: string; term_id: string };
type WaveResult = { generated: boolean; lastError: string | null };

/** Leave headroom under the route's 60s maxDuration. */
const NARRATION_SYNC_INVOKE_BUDGET_MS = 45_000;
const WAVE_CONCURRENCY = 4;
const LEASE_MS = 120_000;

async function markJobFailed(admin: AdminClient, jobId: string, message: string) {
  await admin
    .from("narration_sync_jobs")
    .update({
      status: "failed",
      last_error: message,
      lease_expires_at: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .in("status", [...NARRATION_SYNC_ACTIVE_STATUSES])
    .select("id")
    .maybeSingle();
}

async function releaseLease(admin: AdminClient, jobId: string) {
  await admin
    .from("narration_sync_jobs")
    .update({ lease_expires_at: null })
    .eq("id", jobId)
    .eq("status", "running")
    .select("id")
    .maybeSingle();
}

async function finalizeWave(
  admin: AdminClient,
  jobId: string,
  results: WaveResult[],
  keepLease: boolean,
) {
  const { data: row, error: readError } = await admin
    .from("narration_sync_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (readError) throw readError;

  const generatedDelta = results.filter((result) => result.generated).length;
  const nextCursor = row.cursor + results.length;
  const exhausted = nextCursor >= row.term_ids.length;
  let waveError: string | null = null;
  for (const result of results) {
    if (result.lastError) waveError = result.lastError;
  }
  const counts = {
    cursor: nextCursor,
    generated_count: row.generated_count + generatedDelta,
    failed_count: row.failed_count + (results.length - generatedDelta),
    last_error: waveError ?? row.last_error,
    lease_expires_at:
      exhausted || !keepLease ? null : new Date(Date.now() + LEASE_MS).toISOString(),
  };

  const { data: activeUpdate, error } = await admin
    .from("narration_sync_jobs")
    .update({
      ...counts,
      status: exhausted ? "completed" : "running",
      finished_at: exhausted ? new Date().toISOString() : null,
    })
    .eq("id", jobId)
    .in("status", [...NARRATION_SYNC_ACTIVE_STATUSES])
    .select("status")
    .maybeSingle();
  if (error) throw error;

  if (activeUpdate) return activeUpdate.status === "running";

  const { error: cancelledError } = await admin
    .from("narration_sync_jobs")
    .update(counts)
    .eq("id", jobId)
    .eq("status", "cancelled")
    .select("id")
    .maybeSingle();
  if (cancelledError) throw cancelledError;
  return false;
}

async function claimTick(admin: AdminClient): Promise<ClaimedTick | null> {
  const { data: claimed, error: claimError } = await admin.rpc("claim_narration_sync_tick");
  if (claimError) throw claimError;
  const tick = claimed?.[0];
  if (!tick) return null;
  return { job_id: tick.job_id, term_id: tick.term_id };
}

async function peekSlice(
  admin: AdminClient,
  jobId: string,
  limit: number,
): Promise<string[] | null> {
  const { data: row, error } = await admin
    .from("narration_sync_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (error) throw error;
  if (!isActiveNarrationSyncStatus(row.status)) return null;
  if (row.cursor >= row.term_ids.length) return null;
  return row.term_ids.slice(row.cursor, row.cursor + limit);
}

async function generateTerm(admin: AdminClient, termId: string): Promise<WaveResult> {
  const result = await getOrGenerateNarration(admin, termId);
  const generated = result.status === "ready";
  return { generated, lastError: generated ? null : `Unavailable for term ${termId}` };
}

async function processWave(
  admin: AdminClient,
  jobId: string,
  termIds: string[],
  keepLease: boolean,
): Promise<boolean> {
  try {
    const results = await Promise.all(termIds.map((termId) => generateTerm(admin, termId)));
    return finalizeWave(admin, jobId, results, keepLease);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Narration sync tick failed:", err);
    await markJobFailed(admin, jobId, message);
    return false;
  }
}

export async function processNarrationSyncTick(
  admin: AdminClient,
): Promise<{ shouldContinue: boolean }> {
  const tick = await claimTick(admin);
  if (!tick) return { shouldContinue: false };
  const shouldContinue = await processWave(admin, tick.job_id, [tick.term_id], false);
  return { shouldContinue };
}

export async function processNarrationSyncBatch(
  admin: AdminClient,
  options: { budgetMs?: number } = {},
): Promise<{ shouldContinue: boolean }> {
  const deadline = Date.now() + (options.budgetMs ?? NARRATION_SYNC_INVOKE_BUDGET_MS);
  const claimed = await claimTick(admin);
  if (!claimed) return { shouldContinue: false };

  while (true) {
    const slice = await peekSlice(admin, claimed.job_id, WAVE_CONCURRENCY);
    if (!slice || slice.length === 0) return { shouldContinue: false };
    const shouldContinue = await processWave(admin, claimed.job_id, slice, true);
    if (!shouldContinue) return { shouldContinue: false };
    if (Date.now() >= deadline) {
      await releaseLease(admin, claimed.job_id);
      return { shouldContinue: true };
    }
  }
}

async function requestNarrationSyncTick() {
  const url = `${getPublicBaseUrl()}/api/internal/narration/sync`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${getInternalApiSecret()}` },
  });
  if (!response.ok) {
    console.error("Narration sync worker kick failed:", response.status);
  }
}

export function kickNarrationSyncWorker() {
  after(async () => {
    try {
      await requestNarrationSyncTick();
    } catch (err) {
      console.error("Failed to kick narration sync worker:", err);
    }
  });
}
