/** Pure scoring function for smart queue algorithm.
 */

import { FAIL_STREAK_CAP, NEVER_RECALLED_MIN_SEEN, SOLID_COOLDOWN_HOURS } from "./presets";
import type { PickReason, ReviewCandidate, ScoreWeights } from "./types";

const NEW_TERM_THRESHOLD_HOURS = 72; // Terms created within 72h get new-term boost
const STALE_REASON_THRESHOLD_HOURS = 24;

type ScoreBreakdown = {
  score: number;
  reasons: PickReason[];
};

function evaluateCandidate(
  candidate: ReviewCandidate,
  weights: ScoreWeights,
  now: Date,
): ScoreBreakdown {
  let score = 0;
  const reasons: PickReason[] = [];

  // Solid cooldown: keyed off the last RECALLED outcome, not last_outcome — so a
  // later Seen/Read exposure (e.g. opening the term on the jargon page) can't
  // silently cancel it. Verified is intentionally excluded.
  if (candidate.lastRecalledOutcome === "solid" && candidate.lastRecalledAt) {
    const hoursSinceSolid = (now.getTime() - candidate.lastRecalledAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSolid < SOLID_COOLDOWN_HOURS) {
      score -= weights.solidCooldownPenalty;
      reasons.push("solid_cooldown");
    }
  }

  // Never-read boost (soft cycle: once every term has been Read or Revealed
  // at least once, only staleness / outcome / penalty remain). Keyed on
  // deliberate exposure, not seenCount — a term glanced at via widget
  // rotation, a quiz appearance, or the known/unknown toggle still counts as
  // never read until it's actually opened or revealed.
  if (candidate.readCount === 0 && candidate.reviewRevealCount === 0) {
    score += weights.unseenBoost;
    reasons.push("unseen");
  }

  // Recalled-outcome boosts — the dominant signal. Reads lastRecalledOutcome
  // rather than lastOutcome so a later Seen/Read write never erases it.
  switch (candidate.lastRecalledOutcome) {
    case "learning":
      score += weights.learningBoost;
      reasons.push("learning");
      break;
    case "forgot":
      score += weights.forgotBoost;
      reasons.push("forgot");
      break;
    // "solid" is handled by the cooldown above; "verified" stays inert.
  }

  // Fail streak: scales the learning/forgot boost by how many consecutive
  // fails preceded it, so "failed once" ranks below "genuinely stuck".
  // failStreak is only nonzero when lastRecalledOutcome is learning/forgot,
  // so this always stacks on top of one of the boosts above.
  if (candidate.failStreak >= 2) {
    score += Math.min(candidate.failStreak, FAIL_STREAK_CAP) * weights.failStreakBoostPerRepeat;
    reasons.push("repeat_fail");
  }

  // Never recalled despite repeated light exposure. The never_recalled
  // threshold counts only deliberate exposure (readCount + reviewRevealCount)
  // — incidental Seen-tier sightings (widget rotation, quiz appearances, the
  // known/unknown toggle) don't pad this count. browse_only is the fallback
  // for terms with zero deliberate exposure, gated on seenCount instead since
  // it's purely incidental sightings by definition there.
  if (candidate.recalledCount === 0) {
    const deliberateCount = candidate.readCount + candidate.reviewRevealCount;
    if (deliberateCount >= NEVER_RECALLED_MIN_SEEN) {
      score += weights.neverRecalledBoost;
      reasons.push("never_recalled");
    } else if (deliberateCount === 0 && candidate.seenCount >= NEVER_RECALLED_MIN_SEEN) {
      score += weights.browseOnlyBoost;
      reasons.push("browse_only");
    }
  }

  // Abandoned mid-review: the most recent exposure of any kind was a Review
  // reveal that was never rated (app closed, session expired) — the reveal
  // timestamp exactly matches the last-touched timestamp, meaning nothing
  // (a later plain read, or a rating) has happened since. Distinct from
  // never_recalled — this is a specific interrupted test, not generic
  // rereading.
  if (
    candidate.lastOutcome === "read" &&
    candidate.lastReviewRevealAt &&
    candidate.lastSeenAt &&
    candidate.lastReviewRevealAt.getTime() === candidate.lastSeenAt.getTime()
  ) {
    score += weights.abandonedReviewBoost;
    reasons.push("abandoned_review");
  }

  // New term boost (created recently)
  const ageHours = (now.getTime() - candidate.createdAt.getTime()) / (1000 * 60 * 60);
  if (ageHours < NEW_TERM_THRESHOLD_HOURS) {
    score += weights.newTermBoost;
    reasons.push("new");
  }

  // Seen count penalty — dampens heavily-exposed terms regardless of tier.
  score -= candidate.seenCount * weights.seenCountPenalty;

  // Staleness only ever applies once a term has been recalled at least once,
  // anchored to that real test. Never-recalled terms get no time-based pull —
  // only seenCountPenalty and never_recalled/browse_only account for their
  // light exposure. Without this gate, a term glanced at once and never
  // touched again would keep drifting back up on the clock alone, even though
  // nothing about "being seen" is itself worth re-surfacing for.
  if (candidate.recalledCount > 0 && candidate.lastRecalledAt) {
    const hoursSinceRecalled =
      (now.getTime() - candidate.lastRecalledAt.getTime()) / (1000 * 60 * 60);
    const cappedHours = Math.min(hoursSinceRecalled, weights.stalenessCapHours);
    score += cappedHours * weights.stalenessBoostPerHour;
    if (hoursSinceRecalled >= STALE_REASON_THRESHOLD_HOURS) {
      reasons.push("stale");
    }
  }

  // No signal fired — seen recently with nothing notable to flag. Surface that
  // explicitly instead of leaving the term with an unexplained empty badge list.
  if (reasons.length === 0) {
    reasons.push("steady");
  }

  return { score, reasons };
}

/** Score + reasons in one pass (preferred for pick pipeline). */
export function scoreCandidate(
  candidate: ReviewCandidate,
  weights: ScoreWeights,
  now: Date,
): ScoreBreakdown {
  return evaluateCandidate(candidate, weights, now);
}
