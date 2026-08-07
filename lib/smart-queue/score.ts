/** Pure scoring function for smart queue algorithm.
 */

import { SHOWN_WITHOUT_SOLID_MIN_SEEN, SOLID_COOLDOWN_HOURS } from "./presets";
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

  // Solid cooldown: recently solidified terms sink hard. Verified is intentionally excluded.
  if (candidate.lastOutcome === "solid" && candidate.lastSeenAt) {
    const hoursSinceSolid = (now.getTime() - candidate.lastSeenAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSolid < SOLID_COOLDOWN_HOURS) {
      score -= weights.solidCooldownPenalty;
      reasons.push("solid_cooldown");
    }
  }

  // Unseen boost (soft cycle: after every term has been seen once, only
  // staleness / outcome / penalty remain — there are no unseen candidates left).
  if (candidate.seenCount === 0) {
    score += weights.unseenBoost;
    reasons.push("unseen");
  }

  // Outcome-based boosts
  switch (candidate.lastOutcome) {
    case "learning":
      score += weights.learningBoost;
      reasons.push("learning");
      break;
    case "forgot":
      score += weights.forgotBoost;
      reasons.push("forgot");
      break;
  }

  // Shown many times but never solidified — moderate weakness signal
  if (candidate.seenCount >= SHOWN_WITHOUT_SOLID_MIN_SEEN && candidate.lastOutcome === "shown") {
    score += weights.shownWithoutSolidBoost;
    reasons.push("shown_stuck");
  }

  // New term boost (created recently)
  const ageHours = (now.getTime() - candidate.createdAt.getTime()) / (1000 * 60 * 60);
  if (ageHours < NEW_TERM_THRESHOLD_HOURS) {
    score += weights.newTermBoost;
    reasons.push("new");
  }

  // Seen count penalty
  score -= candidate.seenCount * weights.seenCountPenalty;

  // Staleness boost (terms not seen recently rise in priority)
  if (candidate.lastSeenAt) {
    const hoursSinceLastSeen = (now.getTime() - candidate.lastSeenAt.getTime()) / (1000 * 60 * 60);
    const cappedHours = Math.min(hoursSinceLastSeen, weights.stalenessCapHours);
    score += cappedHours * weights.stalenessBoostPerHour;
    if (hoursSinceLastSeen >= STALE_REASON_THRESHOLD_HOURS) {
      reasons.push("stale");
    }
  } else if (candidate.seenCount > 0) {
    // Seen but no timestamp → treat as maximally stale
    score += weights.stalenessCapHours * weights.stalenessBoostPerHour;
    reasons.push("stale");
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
