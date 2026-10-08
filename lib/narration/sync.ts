import type { SupabaseClient } from "@supabase/supabase-js";
import { AdminError } from "@/lib/admin/admin-error";
import type { Database } from "@/lib/supabase/database.types";
import { isNarrationEnabled } from "./feature";
import { listMissingNarrationTermIds } from "./sync-missing";
import {
  isNarrationSyncLeaseStale,
  NARRATION_SYNC_ACTIVE_STATUSES,
  type NarrationSyncJobView,
  type NarrationSyncStatus,
} from "./sync-shared";

export { canResumeNarrationSync, type NarrationSyncJobView } from "./sync-shared";
export {
  getCollectionNarrationCoverage,
  isCurrentAudio,
  listCollectionTermClips,
  listMissingNarrationTermIds,
} from "./sync-missing";
export {
  kickNarrationSyncWorker,
  processNarrationSyncBatch,
  processNarrationSyncTick,
} from "./sync-worker";

type AdminClient = SupabaseClient<Database>;

function toJobView(
  row: Database["public"]["Tables"]["narration_sync_jobs"]["Row"],
  collectionName: string,
  nowMs: number,
): NarrationSyncJobView {
  return {
    id: row.id,
    collectionId: row.collection_id,
    collectionName,
    status: row.status as NarrationSyncStatus,
    total: row.term_ids.length,
    cursor: row.cursor,
    generatedCount: row.generated_count,
    failedCount: row.failed_count,
    lastError: row.last_error,
    leaseExpired: isNarrationSyncLeaseStale({
      status: row.status,
      leaseExpiresAt: row.lease_expires_at,
      updatedAt: row.updated_at,
      nowMs,
    }),
  };
}

async function collectionNameFor(client: AdminClient, collectionId: string): Promise<string> {
  const { data: collection } = await client
    .from("collections")
    .select("name")
    .eq("id", collectionId)
    .maybeSingle();
  return collection?.name ?? "Unknown collection";
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

  return toJobView(row, await collectionNameFor(client, row.collection_id), Date.now());
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
  collectionId: string,
  startedBy: string,
): Promise<NarrationSyncJobView> {
  if (!(await isNarrationEnabled(admin))) {
    throw new AdminError("Narration is turned off.");
  }

  if (await getActiveJob(admin)) {
    throw new AdminError("A sync is already running.");
  }

  const termIds = await listMissingNarrationTermIds(admin, collectionId);
  if (termIds.length === 0) {
    throw new AdminError("No missing audio in that collection.");
  }

  const { data: collection, error: collectionError } = await admin
    .from("collections")
    .select("id, name")
    .eq("id", collectionId)
    .maybeSingle();
  if (collectionError) throw collectionError;
  if (!collection) throw new AdminError("Collection not found.");

  const { data: row, error } = await admin
    .from("narration_sync_jobs")
    .insert({
      collection_id: collectionId,
      started_by: startedBy,
      status: "queued",
      term_ids: termIds,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new AdminError("A sync is already running.");
    }
    throw error;
  }

  return toJobView(row, collection.name, Date.now());
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

  return toJobView(row, await collectionNameFor(admin, row.collection_id), Date.now());
}
