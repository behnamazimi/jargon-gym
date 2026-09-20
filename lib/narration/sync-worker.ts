import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getInternalApiSecret } from "@/lib/auth/internal-api";
import { getPublicBaseUrl } from "@/lib/seo/base-url";
import type { Database } from "@/lib/supabase/database.types";
import { getOrGenerateNarration } from "./service";
import { NARRATION_SYNC_ACTIVE_STATUSES } from "./sync-shared";

type AdminClient = SupabaseClient<Database>;

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

async function finalizeTick(
  admin: AdminClient,
  jobId: string,
  generated: boolean,
  lastError: string | null,
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
    lease_expires_at: null,
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

export async function processNarrationSyncTick(
  admin: AdminClient,
): Promise<{ shouldContinue: boolean }> {
  const { data: claimed, error: claimError } = await admin.rpc("claim_narration_sync_tick");
  if (claimError) throw claimError;

  const tick = claimed?.[0];
  if (!tick) return { shouldContinue: false };

  try {
    const result = await getOrGenerateNarration(admin, tick.term_id);
    const generated = result.status === "ready";
    const lastError = generated ? null : `Unavailable for term ${tick.term_id}`;
    const shouldContinue = await finalizeTick(admin, tick.job_id, generated, lastError);
    return { shouldContinue };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Narration sync tick failed:", err);
    await markJobFailed(admin, tick.job_id, message);
    return { shouldContinue: false };
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
  after(() => {
    void requestNarrationSyncTick().catch((err) => {
      console.error("Failed to kick narration sync worker:", err);
    });
  });
}

export async function continueNarrationSyncChain() {
  await requestNarrationSyncTick();
}
