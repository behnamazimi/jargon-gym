/** Pool statistics computation.
 */

import { fieldsForContext, shouldAttachStaleReason } from "./score";
import type { PickContext, ReviewCandidate, PoolStats } from "./types";

export function computePoolStats(
  candidates: ReviewCandidate[],
  context: PickContext,
  now: Date = new Date(),
): PoolStats {
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
      if (shouldAttachStaleReason(context, ownCount, lastActivityAt, streak, now)) {
        stale++;
      }
    } else {
      // ownCount > 0 but no timestamp: can't measure recency, so count as
      // stale. Scoring cannot attach the `stale` reason without a timestamp.
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
