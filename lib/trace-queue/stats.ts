/** Pool statistics computation — plain counts, no scoring dependency.
 *  Ported from lib/smart-queue/stats.ts unchanged: this was already
 *  independent of known/unknown, just each tier's own exposure/test count. */

import type { PickContext, TraceCandidate } from "./types";

export type PoolStats = {
  unseen: number;
  seen: number;
  total: number;
  allSeenOnce: boolean;
};

function ownCountForContext(candidate: TraceCandidate, context: PickContext): number {
  switch (context) {
    case "read":
      return candidate.readCount;
    case "review":
      return candidate.reviewRecallCount;
    case "quiz":
      return candidate.quizTestCount;
  }
}

export function computePoolStats(candidates: TraceCandidate[], context: PickContext): PoolStats {
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
