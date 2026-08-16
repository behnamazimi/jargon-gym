/** Pure scoring function for smart queue algorithm.
 *
 *  One formula, three field-bindings. `context` selects which count/streak/
 *  timestamp fields the signals read — Read has no pass/fail concept of its
 *  own, Review and Quiz each read their own independent streak.
 */

import { isSameLocalDay } from "./local-day";
import {
  ENGAGED_MIN_READ_COUNT,
  FAIL_RATE_MIN_ATTEMPTS,
  masteredCooldownHours,
  QUEUE_TIMEZONE,
  RANKING_STALENESS_DECAY_HOURS,
  STREAK_BOOST_CAP,
} from "./weights";
import type { FailSource, PickContext, PickReason, ReviewCandidate, ScoreWeights } from "./types";

const STALE_REASON_THRESHOLD_HOURS = 24;

type ScoreBreakdown = {
  score: number;
  reasons: PickReason[];
};

/** Lifetime fail-rate boost — independent of the current streak sign, so a
 *  persistently difficult term keeps some priority even right after a pass
 *  resets its streak. Cold start: below the minimum attempts, no boost. */
function fragileBoost(totalTests: number, totalFails: number, fragileBoostMax: number): number {
  if (totalTests < FAIL_RATE_MIN_ATTEMPTS) return 0;
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

export function fieldsForContext(candidate: ReviewCandidate, context: PickContext): ContextFields {
  switch (context) {
    case "read":
      return {
        ownCount: candidate.readCount,
        lastActivityAt: candidate.lastReadAt,
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
    isSameLocalDay(candidate.lastReadAt, now, QUEUE_TIMEZONE)
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
    isSameLocalDay(candidate.lastFailAt, now, QUEUE_TIMEZONE)
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
    isSameLocalDay(fields.lastActivityAt, now, QUEUE_TIMEZONE)
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
    const repeats = Math.min(-fields.streak, STREAK_BOOST_CAP);
    score += repeats * weights.strugglingBoostPerStreak;
    reasons.push("struggling");
    if (repeats >= 2) {
      reasons.push("repeat_fail");
    }
  }

  // Engaged (read) but never tested in this context — Review/Quiz only.
  if (context !== "read" && fields.streak === 0 && candidate.readCount >= ENGAGED_MIN_READ_COUNT) {
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
    const repeats = Math.min(-sourceStreak, STREAK_BOOST_CAP);

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
  if (fields.ownCount > 0 && fields.lastActivityAt) {
    const hoursSinceActivity = (now.getTime() - fields.lastActivityAt.getTime()) / (1000 * 60 * 60);
    score += stalenessBoost(
      hoursSinceActivity,
      RANKING_STALENESS_DECAY_HOURS[context],
      weights.stalenessCapHours,
      weights.stalenessMaxBoost,
    );
    if (hoursSinceActivity >= STALE_REASON_THRESHOLD_HOURS) {
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
