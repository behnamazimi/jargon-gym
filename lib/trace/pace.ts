/** §9's threshold-crossing high-water marks (ever_learning_at,
 *  ever_mastered_at) turned into a per-collection "time to next milestone"
 *  estimate for the Mastery page. Pure math, no DB — mirrors the rest of
 *  this folder's layering (docs/trace.md "Where the logic lives").
 *
 *  Deliberately anchored on the permanent high-water marks, never the live
 *  (decaying) knownLabel: a term quietly decaying back out of "known"
 *  would otherwise make the estimate's target recede on its own, with no
 *  relation to the user's actual effort. */

import {
  PACE_ESTIMATE_RANGE_MULTIPLIER,
  PACE_MIN_CROSSINGS,
  PACE_MIN_WINDOW_DAYS,
  PACE_SMALL_REMAINING_THRESHOLD,
  PACE_WINDOW_LADDER_DAYS,
} from "./constants";
import { daysBetween } from "./decay";
import type { TraceCandidate } from "./types";

export type MasteryBucketCounts = {
  neverLearning: number;
  learningNotMastered: number;
  mastered: number;
};

/** Every term sits in exactly one permanent, monotonic bucket — derived
 *  from the two high-water marks, never from the live (decaying) label. */
export function partitionMasteryBuckets(
  candidates: Pick<TraceCandidate, "everLearningAt" | "everMasteredAt">[],
): MasteryBucketCounts {
  let neverLearning = 0;
  let learningNotMastered = 0;
  let mastered = 0;
  for (const c of candidates) {
    if (c.everMasteredAt !== null) mastered++;
    else if (c.everLearningAt !== null) learningNotMastered++;
    else neverLearning++;
  }
  return { neverLearning, learningNotMastered, mastered };
}

export type PaceRate = {
  perDay: number;
  windowDays: number;
  crossingsInWindow: number;
};

/** Window-widening ladder: try each fixed rung, then an all-time rung
 *  anchored on the first-ever crossing of this kind. Null = not enough
 *  data even at the widest rung. */
export function computeCrossingPace(crossingTimestamps: Date[], now: Date): PaceRate | null {
  for (const windowDays of PACE_WINDOW_LADDER_DAYS) {
    const crossingsInWindow = crossingTimestamps.filter(
      (t) => daysBetween(t, now) <= windowDays,
    ).length;
    if (crossingsInWindow >= PACE_MIN_CROSSINGS) {
      return { perDay: crossingsInWindow / windowDays, windowDays, crossingsInWindow };
    }
  }

  if (crossingTimestamps.length < PACE_MIN_CROSSINGS) return null;
  const earliest = new Date(Math.min(...crossingTimestamps.map((t) => t.getTime())));
  const windowDays = Math.max(PACE_MIN_WINDOW_DAYS, daysBetween(earliest, now));
  return {
    perDay: crossingTimestamps.length / windowDays,
    windowDays,
    crossingsInWindow: crossingTimestamps.length,
  };
}

export type MilestoneEstimate =
  | { kind: "none" }
  | { kind: "count"; remaining: number }
  | { kind: "insufficientData"; remaining: number }
  | { kind: "estimate"; remaining: number; lowDays: number; highDays: number };

/** Gating + the point-estimate-to-1.5x-range math, in one place so
 *  callers don't duplicate the threshold checks per milestone. */
export function estimateMilestone(remaining: number, pace: PaceRate | null): MilestoneEstimate {
  if (remaining <= 0) return { kind: "none" };
  if (remaining <= PACE_SMALL_REMAINING_THRESHOLD) return { kind: "count", remaining };
  if (pace === null) return { kind: "insufficientData", remaining };
  const lowDays = remaining / pace.perDay;
  return {
    kind: "estimate",
    remaining,
    lowDays,
    highDays: lowDays * PACE_ESTIMATE_RANGE_MULTIPLIER,
  };
}
