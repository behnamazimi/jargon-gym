/** Pool statistics computation — plain counts, no scoring dependency.
 */

import type { PickContext, ReviewCandidate, PoolStats } from "./types";

/** This context's own exposure/test count — Read's is readCount, Review/Quiz
 *  are their own test counts. Mirrors the field pick.ts's callers already
 *  know about, kept local since nothing else needs the full breakdown
 *  score.ts used to provide. */
function ownCountForContext(candidate: ReviewCandidate, context: PickContext): number {
  switch (context) {
    case "read":
      return candidate.readCount;
    case "review":
      return candidate.reviewRecallCount;
    case "quiz":
      return candidate.quizTestCount;
  }
}

export function computePoolStats(candidates: ReviewCandidate[], context: PickContext): PoolStats {
  let unseen = 0;
  let seen = 0;

  for (const candidate of candidates) {
    if (ownCountForContext(candidate, context) === 0) {
      unseen++;
    } else {
      seen++;
    }
  }

  return {
    unseen,
    seen,
    total: candidates.length,
    allSeenOnce: candidates.length > 0 && unseen === 0,
  };
}
