import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listMissingNarrationTermIds } from "./sync-missing";
import {
  isActiveNarrationSyncStatus,
  NARRATION_SYNC_ACTIVE_STATUSES,
  type NarrationSyncJobView,
  type NarrationSyncStatus,
} from "./sync-shared";

export {
  canResumeNarrationSync,
  type CollectionNarrationCoverage,
  type NarrationSyncJobView,
} from "./sync-shared";
export {
  isCurrentNarration,
  listCollectionNarrationCoverage,
  listMissingNarrationTermIds,
} from "./sync-missing";
export {
  continueNarrationSyncChain,
  kickNarrationSyncWorker,
  processNarrationSyncTick,
} from "./sync-worker";

type AdminClient = SupabaseClient<Database>;

function isLeaseExpired(leaseExpiresAt: string | null, nowMs: number): boolean {
  if (!leaseExpiresAt) return true;
  return Date.parse(leaseExpiresAt) < nowMs;
}

function toJobView(
  row: Database["public"]["Tables"]["narration_sync_jobs"]["Row"],
  domainName: string,
  nowMs: number,
): NarrationSyncJobView {
  return {
    id: row.id,
    domainId: row.domain_id,
    domainName,
    status: row.status as NarrationSyncStatus,
    total: row.term_ids.length,
    cursor: row.cursor,
    generatedCount: row.generated_count,
    failedCount: row.failed_count,
    lastError: row.last_error,
    leaseExpired:
      isActiveNarrationSyncStatus(row.status) && isLeaseExpired(row.lease_expires_at, nowMs),
  };
}

async function domainNameFor(client: AdminClient, domainId: string): Promise<string> {
  const { data: domain } = await client
    .from("domains")
    .select("name")
    .eq("id", domainId)
    .maybeSingle();
  return domain?.name ?? "Unknown collection";
}

export async function getLastNarrationSyncJob(
  client: AdminClient,
): Promise<NarrationSyncJobView | null> {
  const { data: row, error } = await client
    .from("narration_sync_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  return toJobView(row, await domainNameFor(client, row.domain_id), Date.now());
}

async function narrationIsEnabled(admin: AdminClient): Promise<boolean> {
  const { data, error } = await admin
    .from("narration_settings")
    .select("enabled")
    .eq("id", true)
    .single();
  if (error) throw error;
  return data.enabled;
}

async function getActiveJob(admin: AdminClient) {
  const { data, error } = await admin
    .from("narration_sync_jobs")
    .select("id")
    .in("status", [...NARRATION_SYNC_ACTIVE_STATUSES])
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function enqueueNarrationSync(
  admin: AdminClient,
  domainId: string,
  startedBy: string,
): Promise<NarrationSyncJobView> {
  if (!(await narrationIsEnabled(admin))) {
    throw new Error("Narration is turned off.");
  }

  if (await getActiveJob(admin)) {
    throw new Error("A sync is already running.");
  }

  const termIds = await listMissingNarrationTermIds(admin, domainId);
  if (termIds.length === 0) {
    throw new Error("No missing audio in that collection.");
  }

  const { data: domain, error: domainError } = await admin
    .from("domains")
    .select("id, name")
    .eq("id", domainId)
    .maybeSingle();
  if (domainError) throw domainError;
  if (!domain) throw new Error("Collection not found.");

  const { data: row, error } = await admin
    .from("narration_sync_jobs")
    .insert({
      domain_id: domainId,
      started_by: startedBy,
      status: "queued",
      term_ids: termIds,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A sync is already running.");
    }
    throw error;
  }

  return toJobView(row, domain.name, Date.now());
}

export async function cancelNarrationSync(
  admin: AdminClient,
): Promise<NarrationSyncJobView | null> {
  const active = await getActiveJob(admin);
  if (!active) return getLastNarrationSyncJob(admin);

  const { data: row, error } = await admin
    .from("narration_sync_jobs")
    .update({ status: "cancelled", finished_at: new Date().toISOString(), lease_expires_at: null })
    .eq("id", active.id)
    .in("status", [...NARRATION_SYNC_ACTIVE_STATUSES])
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!row) return getLastNarrationSyncJob(admin);

  return toJobView(row, await domainNameFor(admin, row.domain_id), Date.now());
}
