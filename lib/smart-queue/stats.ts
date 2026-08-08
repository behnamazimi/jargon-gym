/** Pool statistics computation.
 */

import type { ReviewCandidate, PoolStats } from "./types";

const STALE_THRESHOLD_HOURS = 24;

export function computePoolStats(candidates: ReviewCandidate[]): PoolStats {
  const now = new Date();
  let unseen = 0;
  let seen = 0;
  let stale = 0;

  for (const candidate of candidates) {
    // "unseen" here mirrors score.ts's never-read boost trigger — deliberate
    // exposure only, not raw seen_count — so allSeenOnce stays in sync with
    // when that boost actually stops applying.
    if (candidate.readCount === 0 && candidate.reviewRevealCount === 0) {
      unseen++;
      continue;
    }

    seen++;

    if (candidate.lastSeenAt) {
      const hoursSinceLastSeen =
        (now.getTime() - candidate.lastSeenAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSeen >= STALE_THRESHOLD_HOURS) {
        stale++;
      }
    } else {
      stale++;
    }
  }

  return {
    unseen,
    seen,
    stale,
    total: candidates.length,
    allSeenOnce: candidates.length > 0 && unseen === 0,
  };
}
