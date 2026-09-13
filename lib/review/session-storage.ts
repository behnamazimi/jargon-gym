import type { ReviewSessionState } from "./types";

const STORAGE_KEY = "jargon-gym:review-session:v1";

export function saveReviewSession(state: ReviewSessionState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors or private browsing restrictions.
  }
}

export function loadReviewSession(): ReviewSessionState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as any;
    if (!parsed.cards?.length || !parsed.setup) return null;

    // Drop legacy shuffle / sortMode fields from older sessions.
    delete parsed.setup.shuffle;
    delete parsed.setup.sortMode;

    parsed.pendingWrites ??= [];
    parsed.complete = parsed.complete === true;

    return parsed as ReviewSessionState;
  } catch {
    return null;
  }
}

export function clearReviewSession(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

/** Drops a settled write from the stored session. Called from onSettled
 *  so a drain after unmount still updates localStorage when React state
 *  no longer will. Clears the session once a completed one has no writes
 *  left, so a reload doesn't offer to resume a finished deck. */
export function dropPendingReviewWrite(writeId: string): void {
  const session = loadReviewSession();
  if (!session) return;

  const pendingWrites = session.pendingWrites.filter((write) => write.id !== writeId);
  if (session.complete && pendingWrites.length === 0) {
    clearReviewSession();
    return;
  }

  saveReviewSession({ ...session, pendingWrites });
}
