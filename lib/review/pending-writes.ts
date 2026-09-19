import type { PendingReviewWrite } from "./types";
import { upsertPendingWrite } from "./writes";

const STORAGE_KEY = "jargon-gym:review-pending-writes:v1";
const LEGACY_SESSION_KEY = "jargon-gym:review-session:v1";

function isPendingWrite(value: unknown): value is PendingReviewWrite {
  if (!value || typeof value !== "object") return false;
  const write = value as PendingReviewWrite;
  return (
    typeof write.id === "string" &&
    typeof write.termId === "string" &&
    typeof write.grade === "number"
  );
}

function readWrites(raw: string | null): PendingReviewWrite[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPendingWrite);
  } catch {
    return [];
  }
}

export function loadPendingReviewWrites(): PendingReviewWrite[] {
  if (typeof window === "undefined") return [];

  try {
    return readWrites(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function savePendingReviewWrites(writes: PendingReviewWrite[]): void {
  if (typeof window === "undefined") return;

  try {
    if (writes.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(writes));
  } catch {
    // Ignore quota errors or private browsing restrictions.
  }
}

/** Pulls unconfirmed grades out of the old finite-session blob, then
 *  deletes that key so a leftover deck can never resume. */
export function takeLegacyReviewSessionWrites(): PendingReviewWrite[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LEGACY_SESSION_KEY);
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("pendingWrites" in parsed)) return [];
    const pending = (parsed as { pendingWrites: unknown }).pendingWrites;
    if (!Array.isArray(pending)) return [];
    return pending.filter(isPendingWrite);
  } catch {
    try {
      window.localStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {
      // Ignore storage errors.
    }
    return [];
  }
}

export function mergePendingWrites(...groups: PendingReviewWrite[][]): PendingReviewWrite[] {
  let merged: PendingReviewWrite[] = [];
  for (const group of groups) {
    for (const write of group) {
      merged = upsertPendingWrite(merged, write);
    }
  }
  return merged;
}
