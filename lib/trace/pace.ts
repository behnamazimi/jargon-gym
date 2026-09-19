/** Mastery-page buckets and the per-collection "time to Mastered"
 *  estimate. Pure math, no DB — mirrors the rest of this folder's
 *  layering (docs/trace.md "Where the logic lives").
 *
 *  Buckets split on activity vs the ever_mastered_at high-water mark,
 *  never the live (decaying) knownLabel: a term you've touched is
 *  learning even if Mastery_adjusted is still below 0.6, and a term
 *  quietly decaying back out of "known" doesn't leave the mastered
 *  bucket. The pace estimate is anchored on the same stamp so its
 *  target can't recede on its own. */

import {
  PACE_ESTIMATE_RANGE_MULTIPLIER,
  PACE_MIN_CROSSINGS,
  PACE_MIN_WINDOW_DAYS,
  PACE_SMALL_REMAINING_THRESHOLD,
  PACE_WINDOW_LADDER_DAYS,
} from "./constants";
import { daysBetween } from "./decay";
import type { TraceCandidate, TraceState } from "./types";

export type MasteryBucketCounts = {
  neverLearning: number;
  learningNotMastered: number;
  mastered: number;
};

/** True once the user has any Read, Review, or Quiz history on this term. */
export function hasTraceActivity(
  state: Pick<TraceState, "readCount" | "reviewRecallCount" | "quizTestCount">,
): boolean {
  return state.readCount > 0 || state.reviewRecallCount > 0 || state.quizTestCount > 0;
}

/** Every earned term sits in exactly one bucket: mastered (everMasteredAt
 *  set), learning (any activity, not mastered), or not started (no
 *  activity). Marked-known terms are filtered out by the caller. */
export function partitionMasteryBuckets(
  candidates: Pick<
    TraceCandidate,
    "everMasteredAt" | "readCount" | "reviewRecallCount" | "quizTestCount"
  >[],
): MasteryBucketCounts {
  let neverLearning = 0;
  let learningNotMastered = 0;
  let mastered = 0;
  for (const c of candidates) {
    if (c.everMasteredAt !== null) mastered++;
    else if (hasTraceActivity(c)) learningNotMastered++;
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
