export const NARRATION_SYNC_ACTIVE_STATUSES = ["queued", "running"] as const;

/** Show Resume only after this long with no lease and no job-row updates. */
const NARRATION_SYNC_STALE_MS = 90_000;

export type NarrationSyncStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type CollectionNarrationCoverage = {
  domainId: string;
  name: string;
  missingCount: number;
};

export type NarrationSyncJobView = {
  id: string;
  domainId: string;
  domainName: string;
  status: NarrationSyncStatus;
  total: number;
  cursor: number;
  generatedCount: number;
  failedCount: number;
  lastError: string | null;
  leaseExpired: boolean;
};

export function isActiveNarrationSyncStatus(status: string): status is "queued" | "running" {
  return status === "queued" || status === "running";
}

export function isNarrationSyncLeaseStale(opts: {
  status: string;
  leaseExpiresAt: string | null;
  updatedAt: string;
  nowMs?: number;
}): boolean {
  if (!isActiveNarrationSyncStatus(opts.status)) return false;
  const nowMs = opts.nowMs ?? Date.now();
  if (opts.leaseExpiresAt) return Date.parse(opts.leaseExpiresAt) < nowMs;
  return Date.parse(opts.updatedAt) < nowMs - NARRATION_SYNC_STALE_MS;
}

export function canResumeNarrationSync(job: NarrationSyncJobView | null): boolean {
  return Boolean(job && isActiveNarrationSyncStatus(job.status) && job.leaseExpired);
}
