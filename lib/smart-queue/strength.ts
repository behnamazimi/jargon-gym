/** Display-only mastery tier. Never feeds back into score.ts. Every strength
 *  surface (mastery page, collection cards, the Review/Quiz session badge)
 *  routes through scoreFromEvidence below — one formula, no duplicated
 *  scoring logic.
 *
 *  Fail-rate confidence is Laplace-smoothed (see activitySubScore) rather
 *  than gated by a hard attempt-count threshold — a small sample is
 *  partially trusted, growing smoothly toward full trust as real attempts
 *  accumulate, instead of snapping between "presumed 0% fail rate" and
 *  "raw observed rate" at one cutoff.
 */

import { fieldsForContext } from "./score";
import type { PickContext, ReviewCandidate } from "./types";
import {
  OVERALL_BAR_SCORE_THRESHOLDS,
  OVERALL_BLEND,
  OVERALL_BUCKETS,
  OVERALL_FAIL_RATE_PRIOR,
  OVERALL_READ_NUDGE,
  OVERALL_STALENESS,
  OVERALL_UNTESTED_READ,
} from "./weights";

/** Cross-context glance-surface mastery — collection cards, stats page, and
 *  (via strengthForCandidate below) the per-context Review/Quiz session
 *  badge. One vocabulary, one formula (scoreFromEvidence) for every
 *  strength surface in the app — see strengthForCandidate for why the
 *  per-context badge isn't a separate calculation. */
export type OverallStrength = "unverified" | "weak" | "medium" | "strong";

export type OverallStrengthResult = {
  score: number; // 0-100, continuous
  bucket: OverallStrength;
  bars: number; // 0-5, for the signal-strength UI
};

/** 0-100 sub-score for one test activity (review or quiz). 0 when never
 *  tested in that activity — the mechanism that prevents a strong Review
 *  streak alone from masking a never-quiz-tested term: untested counts at
 *  full weight in the blend below, not excluded from it.
 *
 *  Fail-rate uses Laplace/Bayesian smoothing instead of a raw ratio: real
 *  fails/attempts are blended with OVERALL_FAIL_RATE_PRIOR.strength
 *  "virtual" attempts at OVERALL_FAIL_RATE_PRIOR.rate, so confidence in
 *  the rate grows smoothly with real evidence instead of a small sample
 *  being read as fully proven the moment it happens to be perfect (2
 *  clean reviews would otherwise score identically to 200 on this half). */
function activitySubScore(count: number, streak: number, failCount: number): number {
  if (count === 0) return 0;

  const priorFails = OVERALL_FAIL_RATE_PRIOR.strength * OVERALL_FAIL_RATE_PRIOR.rate;
  const smoothedFailRate = (failCount + priorFails) / (count + OVERALL_FAIL_RATE_PRIOR.strength);
  const failComponent = 1 - Math.min(smoothedFailRate, 1);

  const streakComponent =
    Math.min(Math.max(streak, 0), OVERALL_BLEND.streakMaxCredit) / OVERALL_BLEND.streakMaxCredit;

  return (
    (OVERALL_BLEND.streakWeight * streakComponent +
      (1 - OVERALL_BLEND.streakWeight) * failComponent) *
    100
  );
}

/** Nudge from Read exposure — shape depends on whether the term has any
 *  test evidence. With test evidence, this is a small, capped tie-break on
 *  top of the blended test score (sqrt diminishing returns) — the cap
 *  equals one bucket gap, so it can carry a weak-but-close term into medium
 *  on its own, but never two boundaries at once (see OVERALL_READ_NUDGE in
 *  weights.ts). With zero test evidence, reads are the *only* signal, so
 *  they get a separate, higher, logarithmic ceiling instead — see
 *  OVERALL_UNTESTED_READ in weights.ts for why a flat 20-point cap made
 *  heavy readers indistinguishable from casual ones. */
function readNudge(readCount: number, hasTestEvidence: boolean): number {
  if (readCount <= 0) return 0;
  if (hasTestEvidence) {
    return Math.min(OVERALL_READ_NUDGE.max, OVERALL_READ_NUDGE.perRead * Math.sqrt(readCount));
  }
  return Math.min(
    OVERALL_UNTESTED_READ.ceiling,
    OVERALL_UNTESTED_READ.logK * Math.log(1 + readCount),
  );
}

/** Evidence-scaled decay constant (τ): interpolates linearly between
 *  OVERALL_STALENESS.tauBaseHours (weak/near-zero pre-decay score) and
 *  OVERALL_STALENESS.tauCapHours (near-100) by how strong the blended
 *  score already is. Keyed off the blended score itself rather than either
 *  context's own streak — this score already has one global staleness
 *  clock (most-recent-activity-across-all-contexts), not three nested
 *  per-context ones, so there's no single "whose streak" to index off. */
function overallStalenessDecayHours(nudgedScore: number): number {
  const t = Math.min(1, Math.max(0, nudgedScore / 100));
  return (
    OVERALL_STALENESS.tauBaseHours +
    (OVERALL_STALENESS.tauCapHours - OVERALL_STALENESS.tauBaseHours) * t
  );
}

/** Evidence-scaled floor: same interpolation shape as overallStalenessDecayHours
 *  above, keyed off the same pre-decay `nudged` score — near-zero evidence
 *  still floors close to 0, but a genuinely maxed term (nudged=100) floors
 *  at OVERALL_STALENESS.floorCap, high enough to protect its bucket
 *  indefinitely (see the constant's comment in weights.ts for the exact
 *  cutoff this is tuned against). */
function overallStalenessFloor(nudgedScore: number): number {
  const t = Math.min(1, Math.max(0, nudgedScore / 100));
  return (
    OVERALL_STALENESS.floorBase + (OVERALL_STALENESS.floorCap - OVERALL_STALENESS.floorBase) * t
  );
}

/** Multiplicative decay toward a floor (not 0) as most-recent-activity-
 *  across-all-contexts ages — same exponential shape as score.ts's
 *  stalenessBoost, inverted (decay toward the floor, not boost toward a
 *  ceiling). The floor keeps a real tested pass from ever fully collapsing
 *  to "indistinguishable from untested," and — since the floor itself is
 *  evidence-scaled (overallStalenessFloor above) — strong evidence now
 *  lands meaningfully higher than weak evidence once both hit their floor,
 *  not just proportionally. */
function stalenessMultiplier(
  hoursSinceLastActivity: number,
  decayConstantHours: number,
  floor: number,
): number {
  if (!Number.isFinite(hoursSinceLastActivity)) return floor;
  return Math.max(floor, Math.exp(-hoursSinceLastActivity / decayConstantHours));
}

/** Bar count for the 5-bar UI, from OVERALL_BAR_SCORE_THRESHOLDS — the same
 *  scale for every term regardless of bucket, so bar count is always
 *  comparable across terms. Any score above 0 shows at least 1 bar; one
 *  more per threshold cleared. A genuine 0 (no evidence of any kind — never
 *  read, never tested) shows 0. */
function scoreToBars(score: number): number {
  if (score <= 0) return 0;
  let bars = 1;
  for (const threshold of OVERALL_BAR_SCORE_THRESHOLDS) {
    if (score >= threshold) bars += 1;
  }
  return bars;
}

/** Bucket for a tested score, from OVERALL_BUCKETS.mediumMinScore /
 *  .strongMinScore — computed directly off the score, not off bar count, so
 *  the bucket cutoffs and the bar-display granularity can be tuned
 *  independently. */
function scoreToBucket(score: number): OverallStrength {
  if (score >= OVERALL_BUCKETS.strongMinScore) return "strong";
  if (score >= OVERALL_BUCKETS.mediumMinScore) return "medium";
  return "weak";
}

/** Latest of a set of nullable timestamps, or null if none exist. Shared by
 *  every strength surface's staleness clock — each just picks a different
 *  set of timestamps to feed in (see computeOverallStrength vs.
 *  strengthForCandidate). */
function latestOf(dates: Array<Date | null>): Date | null {
  return dates
    .filter((d): d is Date => d !== null)
    .reduce<Date | null>((max, d) => (max === null || d > max ? d : max), null);
}

/** The single scoring pipeline shared by every strength surface in the app —
 *  nudge, evidence-scaled staleness decay, clamp, and the
 *  tested-but-scored-0 floor. Callers differ only in what counts as
 *  `blended` (pre-nudge test evidence), `hasTestEvidence`, and which
 *  timestamps feed `lastActivityAt` — everything past that point is
 *  identical, so it lives here once instead of being reimplemented per
 *  surface (see strengthForCandidate for why the per-context Review/Quiz
 *  badge is not a separate formula). */
function scoreFromEvidence(params: {
  blended: number;
  hasTestEvidence: boolean;
  readCount: number;
  lastActivityAt: Date | null;
  now: Date;
}): number {
  const { blended, hasTestEvidence, readCount, lastActivityAt, now } = params;

  const nudged = Math.min(100, blended + readNudge(readCount, hasTestEvidence));
  const hoursSinceLastActivity = lastActivityAt
    ? (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60)
    : Infinity;

  const decayed =
    nudged *
    stalenessMultiplier(
      hoursSinceLastActivity,
      overallStalenessDecayHours(nudged),
      overallStalenessFloor(nudged),
    );
  const rawScore = Math.max(0, Math.min(100, Math.round(decayed)));

  return hasTestEvidence && rawScore === 0 ? 1 : rawScore;
}

/** Blended Review+Quiz mastery with a small Read tie-break and staleness
 *  decay, for surfaces that show one badge per term with no activity
 *  context (collection cards, stats). One formula for every term — a term
 *  with zero Review AND zero Quiz history still gets a real score, driven
 *  entirely by the Read nudge (both sub-scores are naturally 0 when
 *  untested), so exposure-only terms aren't flattened to an identical
 *  "nothing to show" regardless of how many times they've been read.
 *  `unverified` is a label, not a score bypass: it's forced whenever there's
 *  no Review/Quiz history, keeping "never tested" visually distinct (its
 *  own neutral color, never weak/medium/strong's red/yellow/green) from
 *  "tested and struggling," no matter what the underlying number is. A term
 *  tested at least once but scoring 0 (e.g. 100% fail rate) is floored at 1
 *  so it never collides with a genuinely untouched (0 reads, 0 tests) term
 *  — that one is allowed to show a real 0. */
export function computeOverallStrength(
  candidate: ReviewCandidate,
  now: Date,
): OverallStrengthResult {
  const isUnverified = candidate.reviewRecallCount === 0 && candidate.quizTestCount === 0;

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

  const { review: wReview, quiz: wQuiz } = OVERALL_BLEND.weights;
  const blended = (wReview * reviewSub + wQuiz * quizSub) / (wReview + wQuiz);

  const lastActivityAt = latestOf([
    candidate.lastReadAt,
    candidate.lastReviewRecallAt,
    candidate.lastQuizTestedAt,
  ]);

  const score = scoreFromEvidence({
    blended,
    hasTestEvidence: !isUnverified,
    readCount: candidate.readCount,
    lastActivityAt,
    now,
  });

  const bars = scoreToBars(score);
  const bucket: OverallStrength = isUnverified ? "unverified" : scoreToBucket(score);

  return { score, bucket, bars };
}

/** Strength for a candidate's own-context history (Review or Quiz) — the
 *  session-badge counterpart to computeOverallStrength above, built from
 *  the exact same scoreFromEvidence pipeline instead of a separate formula,
 *  so the two never disagree on what "weak"/"medium"/"strong" means. Scoped
 *  to one context's own count/streak/fails (never blends Review+Quiz — that
 *  would defeat the point of a per-context badge), but does fold in the
 *  Read nudge, same as computeOverallStrength: the staleness clock is
 *  max(this context's own last activity, last read), since Read points now
 *  contribute to the score and their own recency should protect them —
 *  deliberately excluding the OTHER context's timestamp, so a Review badge
 *  never decays (or refreshes) based on Quiz activity or vice versa. Read
 *  has no streak/fail concept of its own, so it returns undefined there. */
export function strengthForCandidate(
  candidate: ReviewCandidate,
  context: PickContext,
  now: Date,
): OverallStrength | undefined {
  if (context === "read") return undefined;

  const fields = fieldsForContext(candidate, context);
  const failCount = context === "review" ? candidate.reviewFailCount : candidate.quizFailCount;
  const isUnverified = fields.ownCount === 0;
  const blended = activitySubScore(fields.ownCount, fields.streak ?? 0, failCount);

  const lastActivityAt = latestOf([fields.lastActivityAt, candidate.lastReadAt]);

  const score = scoreFromEvidence({
    blended,
    hasTestEvidence: !isUnverified,
    readCount: candidate.readCount,
    lastActivityAt,
    now,
  });

  return isUnverified ? "unverified" : scoreToBucket(score);
}
