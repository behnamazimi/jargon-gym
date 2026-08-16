/** Display-only mastery tier. Never feeds back into score.ts.
 *
 *  Callers with insufficient own-context history (< FAIL_RATE_MIN_ATTEMPTS
 *  attempts) must pass failRate = 0 — lack of history isn't "historically
 *  hard".
 */

import { fieldsForContext } from "./score";
import type { PickContext, ReviewCandidate } from "./types";
import {
  FAIL_RATE_MIN_ATTEMPTS,
  OVERALL_READ_NUDGE_MAX,
  OVERALL_READ_NUDGE_PER_READ,
  OVERALL_STALENESS_MULTIPLIER_FLOOR,
  OVERALL_STALENESS_TAU_BASE_HOURS,
  OVERALL_STALENESS_TAU_CAP_HOURS,
  OVERALL_WEIGHTS,
  WEIGHTS,
} from "./weights";

export type Strength = "weak" | "medium" | "strong";

export const STRENGTH_WEAK_FAIL_RATE = 0.4;
export const STRENGTH_STRONG_MIN_STREAK = 5;
export const STRENGTH_STRONG_MAX_FAIL_RATE = 0.15;

export function computeStrength(
  streak: number,
  failRate: number,
  hoursSinceLastActivity: number,
): Strength {
  if (streak <= 0 || failRate > STRENGTH_WEAK_FAIL_RATE) return "weak";
  if (
    streak >= STRENGTH_STRONG_MIN_STREAK &&
    failRate < STRENGTH_STRONG_MAX_FAIL_RATE &&
    hoursSinceLastActivity < WEIGHTS.stalenessCapHours
  ) {
    return "strong";
  }
  return "medium";
}

/** Strength for a candidate's own-context history — Read has no streak/fail
 *  concept of its own, so it returns undefined there. */
export function strengthForCandidate(
  candidate: ReviewCandidate,
  context: PickContext,
  now: Date,
): Strength | undefined {
  if (context === "read") return undefined;

  const fields = fieldsForContext(candidate, context);
  const totalFails = context === "review" ? candidate.reviewFailCount : candidate.quizFailCount;
  const failRate = fields.ownCount < FAIL_RATE_MIN_ATTEMPTS ? 0 : totalFails / fields.ownCount;
  const hoursSinceLastActivity = fields.lastActivityAt
    ? (now.getTime() - fields.lastActivityAt.getTime()) / (1000 * 60 * 60)
    : Infinity;

  return computeStrength(fields.streak ?? 0, failRate, hoursSinceLastActivity);
}

/** Cross-context glance-surface mastery — collection cards, stats page.
 *  Never feeds back into computeStrength/strengthForCandidate above, which
 *  drive the per-context Review/Quiz pick-UI badges unchanged. */
export type OverallStrength = "unverified" | "weak" | "medium" | "strong";

export type OverallStrengthResult = {
  score: number; // 0-100, continuous
  bucket: OverallStrength;
  bars: number; // 0-5, for the signal-strength UI
};

/** 0-100 sub-score for one test activity (review or quiz). 0 when never
 *  tested in that activity — the mechanism that prevents a strong Review
 *  streak alone from masking a never-quiz-tested term: untested counts at
 *  full weight in the blend below, not excluded from it. */
function activitySubScore(count: number, streak: number, failCount: number): number {
  if (count === 0) return 0;
  const failRate = count < FAIL_RATE_MIN_ATTEMPTS ? 0 : failCount / count;
  const streakComponent = Math.min(Math.max(streak, 0), 5) / 5;
  const failComponent = 1 - Math.min(failRate, 1);
  return (0.6 * streakComponent + 0.4 * failComponent) * 100;
}

/** Small, capped, diminishing-returns nudge from Read exposure — enough to
 *  break a tie, never enough to cross a bucket boundary alone. */
function readNudge(readCount: number): number {
  if (readCount <= 0) return 0;
  return Math.min(OVERALL_READ_NUDGE_MAX, OVERALL_READ_NUDGE_PER_READ * Math.sqrt(readCount));
}

/** Evidence-scaled decay constant (τ): interpolates linearly between
 *  OVERALL_STALENESS_TAU_BASE_HOURS (weak/near-zero pre-decay score) and
 *  OVERALL_STALENESS_TAU_CAP_HOURS (near-100) by how strong the blended
 *  score already is. Keyed off the blended score itself rather than either
 *  context's own streak — this score already has one global staleness
 *  clock (most-recent-activity-across-all-contexts), not three nested
 *  per-context ones, so there's no single "whose streak" to index off. */
function overallStalenessDecayHours(nudgedScore: number): number {
  const t = Math.min(1, Math.max(0, nudgedScore / 100));
  return (
    OVERALL_STALENESS_TAU_BASE_HOURS +
    (OVERALL_STALENESS_TAU_CAP_HOURS - OVERALL_STALENESS_TAU_BASE_HOURS) * t
  );
}

/** Multiplicative decay toward a floor (not 0) as most-recent-activity-
 *  across-all-contexts ages — same exponential shape as score.ts's
 *  stalenessBoost, inverted (decay toward the floor, not boost toward a
 *  ceiling). The floor keeps a real tested pass from ever fully collapsing
 *  to "indistinguishable from untested," proportionally — weak evidence
 *  still lands lower than strong evidence once both hit it. */
function stalenessMultiplier(hoursSinceLastActivity: number, decayConstantHours: number): number {
  if (!Number.isFinite(hoursSinceLastActivity)) return OVERALL_STALENESS_MULTIPLIER_FLOOR;
  return Math.max(
    OVERALL_STALENESS_MULTIPLIER_FLOOR,
    Math.exp(-hoursSinceLastActivity / decayConstantHours),
  );
}

/** Blended Review+Quiz mastery with a small Read tie-break and staleness
 *  decay, for surfaces that show one badge per term with no activity
 *  context (collection cards, stats). Zero Review AND zero Quiz history is
 *  "unverified" — never tested, not "tested and weak" — regardless of known
 *  status or Read exposure. A term tested at least once but scoring 0 (e.g.
 *  100% fail rate) is floored at 1 so it never collides visually with
 *  unverified. */
export function computeOverallStrength(
  candidate: ReviewCandidate,
  now: Date,
): OverallStrengthResult {
  if (candidate.reviewRecallCount === 0 && candidate.quizTestCount === 0) {
    return { score: 0, bucket: "unverified", bars: 0 };
  }

  const reviewSub = activitySubScore(
    candidate.reviewRecallCount,
    candidate.reviewStreak,
    candidate.reviewFailCount,
  );
  const quizSub = activitySubScore(
    candidate.quizTestCount,
    candidate.quizStreak,
    candidate.quizFailCount,
  );

  const { review: wReview, quiz: wQuiz } = OVERALL_WEIGHTS;
  const blended = (wReview * reviewSub + wQuiz * quizSub) / (wReview + wQuiz);
  const nudged = Math.min(100, blended + readNudge(candidate.readCount));

  const lastActivityAt = [
    candidate.lastReadAt,
    candidate.lastReviewRecallAt,
    candidate.lastQuizTestedAt,
  ]
    .filter((d): d is Date => d !== null)
    .reduce<Date | null>((max, d) => (max === null || d > max ? d : max), null);
  const hoursSinceLastActivity = lastActivityAt
    ? (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60)
    : Infinity;

  const decayed =
    nudged * stalenessMultiplier(hoursSinceLastActivity, overallStalenessDecayHours(nudged));
  const score = Math.max(0, Math.min(100, Math.round(decayed)));
  const flooredScore = score === 0 ? 1 : score;

  const bars =
    flooredScore >= 95
      ? 5
      : flooredScore >= 75
        ? 4
        : flooredScore >= 55
          ? 3
          : flooredScore >= 35
            ? 2
            : 1;
  const bucket: OverallStrength = bars <= 2 ? "weak" : bars === 3 ? "medium" : "strong";

  return { score: flooredScore, bucket, bars };
}
