/** Pure scoring function for smart queue algorithm.
 *
 *  One formula, three field-bindings. `context` selects which count/streak/
 *  timestamp fields the signals read — Read has no pass/fail concept of its
 *  own, Review and Quiz each read their own independent streak.
 */

import { isSameLocalDay } from "./local-day";
import {
  effectiveStalenessDecayHours,
  masteredCooldownHours,
  RANKING,
  staleReasonThresholdHours,
} from "./weights";
import type { FailSource, PickContext, PickReason, ReviewCandidate, ScoreWeights } from "./types";

type ScoreBreakdown = {
  score: number;
  reasons: PickReason[];
};

/** Lifetime fail-rate boost — independent of the current streak sign, so a
 *  persistently difficult term keeps some priority even right after a pass
 *  resets its streak. Cold start: below the minimum attempts, no boost. */
function fragileBoost(totalTests: number, totalFails: number, fragileBoostMax: number): number {
  if (totalTests < RANKING.failRateMinAttempts) return 0;
  const failRate = totalFails / totalTests;
  return failRate * fragileBoostMax;
}

/** Exponential-decay-shaped staleness: front-loads the boost near a term's
 *  own decay constant (τ) instead of accruing linearly, then flattens out
 *  approaching the cap. Ceiling matches stalenessMaxBoost regardless of τ. */
function stalenessBoost(
  hoursSinceLastActivity: number,
  decayConstantHours: number,
  stalenessCapHours: number,
  stalenessMaxBoost: number,
): number {
  const capped = Math.min(hoursSinceLastActivity, stalenessCapHours);
  const normalized = 1 - Math.exp(-capped / decayConstantHours);
  return normalized * stalenessMaxBoost;
}

/** Second, smaller boost that only activates once a candidate is past the
 *  base curve's own cap — prevents every candidate neglected 8 days from
 *  scoring identically to one neglected 800 days. Deliberately not streak-
 *  scaled (unlike stalenessBoost's decay constant): this is a pure "break
 *  ties among the already-stale" mechanism, not a proof-of-mastery one, so
 *  it applies unconditionally across all three contexts including Read.
 *  tailDecayHours is RANKING.masteredCooldown.capHours reused directly, not
 *  a new constant — see docs/smart-queue.md. */
function stalenessTailBoost(
  hoursSinceLastActivity: number,
  stalenessCapHours: number,
  tailDecayHours: number,
  tailMaxBoost: number,
): number {
  const extraHours = Math.max(0, hoursSinceLastActivity - stalenessCapHours);
  const normalized = 1 - Math.exp(-extraHours / tailDecayHours);
  return normalized * tailMaxBoost;
}

export type ContextFields = {
  /** This context's own test/exposure count — Read's is readCount, Review/Quiz are their own test counts. */
  ownCount: number;
  /** Timestamp staleness is measured from, only when ownCount > 0. */
  lastActivityAt: Date | null;
  /** Signed streak for this context — null for "read", which has no pass/fail concept. */
  streak: number | null;
  /** The OTHER test activity's failure source name, for cross-fail gating. */
  otherActivity: FailSource | null;
};

/** The named activity's own streak, regardless of which context is currently scoring. */
function streakForActivity(candidate: ReviewCandidate, activity: FailSource): number {
  return activity === "review" ? candidate.reviewStreak : candidate.quizStreak;
}

/** Later of two nullable dates, or null if neither exists. 2-argument
 *  sibling of strength.ts's array-based `latestOf` — kept local (not
 *  imported) because strength.ts imports `fieldsForContext` from this
 *  file, so importing back from strength.ts would cycle. */
function laterOf(a: Date | null, b: Date | null): Date | null {
  if (a === null) return b;
  if (b === null) return a;
  return a > b ? a : b;
}

export function fieldsForContext(candidate: ReviewCandidate, context: PickContext): ContextFields {
  switch (context) {
    case "read":
      return {
        ownCount: candidate.readCount,
        lastActivityAt: laterOf(candidate.lastReadAt, candidate.lastReviewRecallAt),
        streak: null,
        otherActivity: null,
      };
    case "review":
      return {
        ownCount: candidate.reviewRecallCount,
        lastActivityAt: candidate.lastReviewRecallAt,
        streak: candidate.reviewStreak,
        otherActivity: "quiz",
      };
    case "quiz":
      return {
        ownCount: candidate.quizTestCount,
        lastActivityAt: candidate.lastQuizTestedAt,
        streak: candidate.quizStreak,
        otherActivity: "review",
      };
  }
}

/** Whether the `stale` reason/badge (and matching pool-stat bucket) attaches.
 *  Label-only: the staleness score boost is independent of this. Skips
 *  while mastered cooldown is active so "Recently mastered" never pairs
 *  with "Not reviewed/quizzed recently." */
export function shouldAttachStaleReason(
  context: PickContext,
  ownCount: number,
  lastActivityAt: Date | null,
  streak: number | null,
  now: Date,
): boolean {
  if (ownCount === 0 || !lastActivityAt) return false;
  const hoursSinceActivity = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceActivity < staleReasonThresholdHours(context)) return false;
  if (streak !== null && streak > 0 && hoursSinceActivity < masteredCooldownHours(streak)) {
    return false;
  }
  return true;
}

function evaluateCandidate(
  candidate: ReviewCandidate,
  weights: ScoreWeights,
  context: PickContext,
  now: Date,
): ScoreBreakdown {
  let score = 0;
  const reasons: PickReason[] = [];

  const fields = fieldsForContext(candidate, context);

  // Mastered cooldown: streak > 0 and recent. Independent per context — an
  // acing streak in Quiz never suppresses Review, and vice versa.
  if (fields.streak !== null && fields.streak > 0 && fields.lastActivityAt) {
    const hoursSincePass = (now.getTime() - fields.lastActivityAt.getTime()) / (1000 * 60 * 60);
    if (hoursSincePass < masteredCooldownHours(fields.streak)) {
      score -= weights.masteredCooldownPenalty;
      reasons.push("mastered_cooldown");
    }
  }

  // Same-day Read → Review/Quiz sit-out: you just saw the definition.
  if (
    context !== "read" &&
    candidate.lastReadAt &&
    isSameLocalDay(candidate.lastReadAt, now, RANKING.timezone)
  ) {
    score -= weights.sameDayCooldownPenalty;
    reasons.push("recent_read_cooldown");
  }

  // Same-day fail → Read sit-out, Review-sourced fails only. A Quiz miss no
  // longer sits Read out — Quiz is a check on the known pool, not a way to
  // learn, so re-exposing the definition via Read the same day is fine.
  // Cleared when last_fail_* is cleared (pass or Read).
  if (
    context === "read" &&
    candidate.lastFailAt &&
    candidate.lastFailSource === "review" &&
    isSameLocalDay(candidate.lastFailAt, now, RANKING.timezone)
  ) {
    score -= weights.sameDayCooldownPenalty;
    reasons.push("recent_fail_cooldown");
  }

  // Same-day own-fail sit-out (Review and Quiz each sit out their own miss,
  // independent of the fail→Read rule above). Keyed off this context's own
  // streak/last-activity, not last_fail_at — a Read or a pass in the other
  // activity must not lift it. Cross-fail to the other test activity still
  // fires below; struggling still fires too, for debug ranking.
  if (
    context !== "read" &&
    fields.streak !== null &&
    fields.streak < 0 &&
    fields.lastActivityAt &&
    isSameLocalDay(fields.lastActivityAt, now, RANKING.timezone)
  ) {
    score -= weights.sameDayCooldownPenalty;
    reasons.push("recent_fail_cooldown");
  }

  // Never engaged in this context.
  if (fields.ownCount === 0) {
    score += weights.unseenBoost;
    reasons.push("unseen");
  }

  // Struggling: negative streak, magnitude-scaled.
  if (fields.streak !== null && fields.streak < 0) {
    const repeats = Math.min(-fields.streak, RANKING.streakBoostCap);
    score += repeats * weights.strugglingBoostPerStreak;
    reasons.push("struggling");
    if (repeats >= 2) {
      reasons.push("repeat_fail");
    }
  }

  // Engaged (read) but never tested in this context — Review/Quiz only.
  if (
    context !== "read" &&
    fields.ownCount === 0 &&
    candidate.readCount >= RANKING.engagedMinReadCount
  ) {
    score += weights.engagedButUntestedBoost;
    reasons.push("engaged_untested");
  }

  // Abandoned mid-review — Review context only.
  if (context === "review" && candidate.pendingReveal) {
    score += weights.abandonedReviewBoost;
    reasons.push("abandoned_review");
  }

  // Cross-activity fail: Quiz→Review only. A fail can't happen by lucky
  // guessing, so the OTHER test activity gets nudged — but Review misses no
  // longer boost Quiz (Quiz ranks its own known pool by hard tiers, not this
  // score). Read no longer gets a fail boost — it uses recent_fail_cooldown
  // instead. Scaled by the source activity's own streak magnitude, same as
  // struggling.
  if (
    context !== "read" &&
    !(context === "quiz" && candidate.lastFailSource === "review") &&
    candidate.lastFailAt &&
    candidate.lastFailSource &&
    candidate.lastFailSource === fields.otherActivity
  ) {
    const sourceStreak = streakForActivity(candidate, candidate.lastFailSource);
    const repeats = Math.min(-sourceStreak, RANKING.streakBoostCap);

    if (repeats > 0) {
      score += repeats * weights.crossFailOtherTestBoostPerRepeat;
      reasons.push("cross_fail");
      if (repeats >= 2 && !reasons.includes("repeat_fail")) {
        reasons.push("repeat_fail");
      }
    }
  }

  // Lifetime fail-rate — Review/Quiz only, independent of current streak.
  if (context !== "read") {
    const totalFails = context === "review" ? candidate.reviewFailCount : candidate.quizFailCount;
    const boost = fragileBoost(fields.ownCount, totalFails, weights.fragileBoostMax);
    if (boost > 0) {
      score += boost;
      reasons.push("fragile");
    }
  }

  // Staleness — only once this context has some activity to measure from.
  // τ is scaled per-candidate for Review/Quiz (streak > 1) by the same
  // ratio masteredCooldownHours already earns for the cooldown window — a
  // term that's earned a longer rest also earns a slower staleness climb
  // once that rest ends. Read has no streak (fields.streak is null there),
  // so it keeps the flat per-context τ unconditionally. A second, smaller
  // boost past the cap (stalenessTailBoost) breaks ties by genuine wait
  // time once the base curve has flattened out — unconditional across all
  // three contexts, unlike the τ-scaling above.
  if (fields.ownCount > 0 && fields.lastActivityAt) {
    const hoursSinceActivity = (now.getTime() - fields.lastActivityAt.getTime()) / (1000 * 60 * 60);
    const decayHours =
      fields.streak !== null
        ? effectiveStalenessDecayHours(fields.streak, RANKING.stalenessDecayHours[context])
        : RANKING.stalenessDecayHours[context];
    score += stalenessBoost(
      hoursSinceActivity,
      decayHours,
      weights.stalenessCapHours,
      weights.stalenessMaxBoost,
    );
    score += stalenessTailBoost(
      hoursSinceActivity,
      weights.stalenessCapHours,
      RANKING.masteredCooldown.capHours,
      weights.stalenessTailMaxBoost,
    );
    if (
      shouldAttachStaleReason(context, fields.ownCount, fields.lastActivityAt, fields.streak, now)
    ) {
      reasons.push("stale");
    }
  }

  // No signal fired — fallback. Only reachable when ownCount > 0: unseen
  // already covers ownCount === 0 unconditionally above, so there's nothing
  // left to distinguish here once a term has any activity in this context.
  if (reasons.length === 0) {
    reasons.push("steady");
  }

  return { score, reasons };
}

/** Score + reasons in one pass (preferred for pick pipeline). */
export function scoreCandidate(
  candidate: ReviewCandidate,
  weights: ScoreWeights,
  context: PickContext,
  now: Date,
): ScoreBreakdown {
  return evaluateCandidate(candidate, weights, context, now);
}
