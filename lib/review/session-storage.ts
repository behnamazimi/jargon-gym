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

    const parsed = JSON.parse(raw) as ReviewSessionState;
    if (!parsed.cards?.length || !parsed.setup) return null;

    return parsed;
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
