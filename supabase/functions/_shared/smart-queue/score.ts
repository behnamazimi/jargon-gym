/** Pure scoring function for smart queue algorithm.
 *  KEEP IN SYNC with lib/smart-queue/score.ts
 */

import type { ReviewCandidate, ScoreWeights } from "./types.ts";

const NEW_TERM_THRESHOLD_HOURS = 72; // Terms created within 72h get new-term boost

export function computeScore(candidate: ReviewCandidate, weights: ScoreWeights, now: Date): number {
  let score = 0;

  // Unseen boost (soft cycle: after every term has been seen once, only
  // staleness / outcome / penalty remain — there are no unseen candidates left).
  if (candidate.seenCount === 0) {
    score += weights.unseenBoost;
  }

  // Outcome-based boosts
  switch (candidate.lastOutcome) {
    case "learning":
      score += weights.learningBoost;
      break;
    case "forgot":
      score += weights.forgotBoost;
      break;
  }

  // New term boost (created recently)
  const ageHours = (now.getTime() - candidate.createdAt.getTime()) / (1000 * 60 * 60);
  if (ageHours < NEW_TERM_THRESHOLD_HOURS) {
    score += weights.newTermBoost;
  }

  // Seen count penalty
  score -= candidate.seenCount * weights.seenCountPenalty;

  // Staleness boost (terms not seen recently rise in priority)
  if (candidate.lastSeenAt) {
    const hoursSinceLastSeen = (now.getTime() - candidate.lastSeenAt.getTime()) / (1000 * 60 * 60);
    const cappedHours = Math.min(hoursSinceLastSeen, weights.stalenessCapHours);
    score += cappedHours * weights.stalenessBoostPerHour;
  } else if (candidate.seenCount > 0) {
    // Seen but no timestamp → treat as maximally stale
    score += weights.stalenessCapHours * weights.stalenessBoostPerHour;
  }

  return score;
}
