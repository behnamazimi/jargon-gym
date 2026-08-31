/** Term selection — pure random sampling from the eligible pool. No
 *  scoring, no staleness, no cooldowns, no lane-mixing, no tiers. Every
 *  pick function here is a thin wrapper around {@link pickRandom}.
 */

import type { ReviewCandidate } from "./types";

/** Fisher–Yates shuffle-and-slice: returns up to `limit` items from
 *  `items`, in random order, never mutating the input. */
export function pickRandom<T>(items: T[], limit: number): T[] {
  if (items.length === 0 || limit <= 0) return [];

  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }

  return arr.slice(0, limit);
}

export function pickTerms(candidates: ReviewCandidate[], limit: number): ReviewCandidate[] {
  return pickRandom(candidates, limit);
}

export function pickQuizTerms(candidates: ReviewCandidate[], limit: number): ReviewCandidate[] {
  return pickRandom(candidates, limit);
}

export function pickStaleKnownTerms(
  candidates: ReviewCandidate[],
  limit: number,
): ReviewCandidate[] {
  return pickRandom(candidates, limit);
}

/** Review's blended pick: known + unknown pools combined, sampled uniformly
 *  — no ratio, no proportional interleave. */
export function pickMixedReviewTerms(
  unknown: ReviewCandidate[],
  known: ReviewCandidate[],
  limit: number,
): ReviewCandidate[] {
  return pickRandom([...unknown, ...known], limit);
}

/** Which pool a candidate came from — derived from `knownAt`, not stored
 *  separately, since the repository already populates it correctly
 *  per-candidate regardless of which status was queried. */
export function originOf(candidate: ReviewCandidate): "known" | "unknown" {
  return candidate.knownAt !== null ? "known" : "unknown";
}
