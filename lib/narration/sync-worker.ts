import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getInternalApiSecret } from "@/lib/auth/internal-api";
import { getPublicBaseUrl } from "@/lib/seo/base-url";
import type { Database } from "@/lib/supabase/database.types";
import { getOrGenerateNarration } from "./service";
import { isActiveNarrationSyncStatus, NARRATION_SYNC_ACTIVE_STATUSES } from "./sync-shared";

type AdminClient = SupabaseClient<Database>;
type ClaimedTick = { job_id: string; term_id: string };

/** Leave headroom under the route's 60s maxDuration for the next hop. */
const NARRATION_SYNC_INVOKE_BUDGET_MS = 45_000;
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

async function finalizeTick(
  admin: AdminClient,
  jobId: string,
  generated: boolean,
  lastError: string | null,
  keepLease: boolean,
) {
  const { data: row, error: readError } = await admin
    .from("narration_sync_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (readError) throw readError;

  const nextCursor = row.cursor + 1;
  const exhausted = nextCursor >= row.term_ids.length;
  const counts = {
    cursor: nextCursor,
    generated_count: row.generated_count + (generated ? 1 : 0),
    failed_count: row.failed_count + (generated ? 0 : 1),
    last_error: lastError ?? row.last_error,
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

async function peekNextTerm(admin: AdminClient, jobId: string): Promise<ClaimedTick | null> {
  const { data: row, error } = await admin
    .from("narration_sync_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (error) throw error;
  if (!isActiveNarrationSyncStatus(row.status)) return null;
  if (row.cursor >= row.term_ids.length) return null;
  return { job_id: row.id, term_id: row.term_ids[row.cursor] };
}

async function processClaimedTerm(
  admin: AdminClient,
  tick: ClaimedTick,
  keepLease: boolean,
): Promise<boolean> {
  try {
    const result = await getOrGenerateNarration(admin, tick.term_id);
    const generated = result.status === "ready";
    const lastError = generated ? null : `Unavailable for term ${tick.term_id}`;
    return finalizeTick(admin, tick.job_id, generated, lastError, keepLease);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Narration sync tick failed:", err);
    await markJobFailed(admin, tick.job_id, message);
    return false;
  }
}

export async function processNarrationSyncTick(
  admin: AdminClient,
): Promise<{ shouldContinue: boolean }> {
  const tick = await claimTick(admin);
  if (!tick) return { shouldContinue: false };
  const shouldContinue = await processClaimedTerm(admin, tick, false);
  return { shouldContinue };
}

export async function processNarrationSyncBatch(
  admin: AdminClient,
  options: { budgetMs?: number } = {},
): Promise<{ shouldContinue: boolean }> {
  const deadline = Date.now() + (options.budgetMs ?? NARRATION_SYNC_INVOKE_BUDGET_MS);
  let tick = await claimTick(admin);
  if (!tick) return { shouldContinue: false };

  while (true) {
    const shouldContinue = await processClaimedTerm(admin, tick, true);
    if (!shouldContinue) return { shouldContinue: false };
    if (Date.now() >= deadline) {
      await releaseLease(admin, tick.job_id);
      return { shouldContinue: true };
    }
    const next = await peekNextTerm(admin, tick.job_id);
    if (!next) return { shouldContinue: false };
    tick = next;
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

export async function continueNarrationSyncChain() {
  await requestNarrationSyncTick();
}
