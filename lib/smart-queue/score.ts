/** Pure scoring function for smart queue algorithm.
 *
 *  One formula, three field-bindings. `context` selects which count/streak/
 *  timestamp fields the signals read — Read has no pass/fail concept of its
 *  own, Review and Quiz each read their own independent streak.
 */

import { ENGAGED_MIN_COUNT, FAIL_STREAK_CAP, SOLID_COOLDOWN_HOURS } from "./weights";
import type { FailSource, PickContext, PickReason, ReviewCandidate, ScoreWeights } from "./types";

const NEW_TERM_THRESHOLD_HOURS = 72;
const STALE_REASON_THRESHOLD_HOURS = 24;

type ScoreBreakdown = {
  score: number;
  reasons: PickReason[];
};

type ContextFields = {
  /** This context's own test/exposure count — Read's is readCount, Review/Quiz are their own test counts. */
  ownCount: number;
  /** Timestamp staleness is measured from, only when ownCount > 0. */
  lastActivityAt: Date | null;
  /** Signed streak for this context — null for "read", which has no pass/fail concept. */
  streak: number | null;
  /** The OTHER test activity's failure source name, for cross-fail gating. */
  otherActivity: FailSource | null;
};

function fieldsForContext(candidate: ReviewCandidate, context: PickContext): ContextFields {
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
    if (hoursSincePass < SOLID_COOLDOWN_HOURS) {
      score -= weights.masteredCooldownPenalty;
      reasons.push("mastered_cooldown");
    }
  }

  // Never engaged in this context.
  if (fields.ownCount === 0) {
    score += weights.unseenBoost;
    reasons.push("unseen");
  }

  // Struggling: negative streak, magnitude-scaled.
  if (fields.streak !== null && fields.streak < 0) {
    const repeats = Math.min(-fields.streak, FAIL_STREAK_CAP);
    score += repeats * weights.strugglingBoostPerStreak;
    reasons.push("struggling");
    if (repeats >= 2) {
      reasons.push("repeat_fail");
    }
  }

  // Engaged (read) but never tested in this context — Review/Quiz only.
  if (context !== "read" && fields.streak === 0 && candidate.readCount >= ENGAGED_MIN_COUNT) {
    score += weights.engagedButUntestedBoost;
    reasons.push("engaged_untested");
  }

  // Abandoned mid-review — Review context only.
  if (context === "review" && candidate.pendingReveal) {
    score += weights.abandonedReviewBoost;
    reasons.push("abandoned_review");
  }

  // Cross-activity fail propagation: only fails cross over (a fail can't
  // happen by lucky guessing, a pass can — see docs/smart-queue.md). Read
  // gets nudged by a fail from either activity; a test context gets nudged
  // only when the OTHER activity most recently failed (its own streak
  // already covers a fail from itself).
  if (candidate.lastFailAt) {
    if (context === "read") {
      score += weights.crossFailReadBoost;
      reasons.push("cross_fail");
    } else if (candidate.lastFailSource === fields.otherActivity) {
      score += weights.crossFailOtherTestBoost;
      reasons.push("cross_fail");
    }
  }

  // New term boost.
  const ageHours = (now.getTime() - candidate.createdAt.getTime()) / (1000 * 60 * 60);
  if (ageHours < NEW_TERM_THRESHOLD_HOURS) {
    score += weights.newTermBoost;
    reasons.push("new");
  }

  // Staleness — only once this context has some activity to measure from.
  if (fields.ownCount > 0 && fields.lastActivityAt) {
    const hoursSinceActivity =
      (now.getTime() - fields.lastActivityAt.getTime()) / (1000 * 60 * 60);
    const cappedHours = Math.min(hoursSinceActivity, weights.stalenessCapHours);
    score += cappedHours * weights.stalenessBoostPerHour;
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
