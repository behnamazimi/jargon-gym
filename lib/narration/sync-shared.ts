export const NARRATION_SYNC_ACTIVE_STATUSES = ["queued", "running"] as const;

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

export function canResumeNarrationSync(job: NarrationSyncJobView | null): boolean {
  return Boolean(job && isActiveNarrationSyncStatus(job.status) && job.leaseExpired);
}
