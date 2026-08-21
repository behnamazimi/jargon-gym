/** Pool statistics computation.
 */

import { fieldsForContext } from "./score";
import type { PickContext, ReviewCandidate, PoolStats } from "./types";

const STALE_THRESHOLD_HOURS = 24;

export function computePoolStats(candidates: ReviewCandidate[], context: PickContext): PoolStats {
  const now = new Date();
  let unseen = 0;
  let seen = 0;
  let stale = 0;
  let struggling = 0;

  for (const candidate of candidates) {
    // Mirrors score.ts's unseen signal for this context — deliberate
    // exposure only — so allSeenOnce stays in sync with when that boost
    // actually stops applying.
    const { ownCount, lastActivityAt, streak } = fieldsForContext(candidate, context);

    if (ownCount === 0) {
      unseen++;
      continue;
    }

    seen++;

    if ((streak ?? 0) < 0) struggling++;

    if (lastActivityAt) {
      const hoursSinceActivity = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceActivity >= STALE_THRESHOLD_HOURS) {
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
    recent: seen - stale,
    struggling,
    total: candidates.length,
    allSeenOnce: candidates.length > 0 && unseen === 0,
  };
}
