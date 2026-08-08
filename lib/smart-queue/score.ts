/** Pure scoring function for smart queue algorithm.
 */

import { NEVER_RECALLED_MIN_SEEN, SOLID_COOLDOWN_HOURS } from "./presets";
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

  // Unseen boost (soft cycle: after every term has been seen once, only
  // staleness / outcome / penalty remain — there are no unseen candidates left).
  if (candidate.seenCount === 0) {
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

  // Never recalled despite repeated light exposure — replaces the old
  // "shown_stuck": fires regardless of whether the exposure was Seen or Read,
  // the point is the user has never once been asked to prove recall.
  if (candidate.recalledCount === 0 && candidate.seenCount >= NEVER_RECALLED_MIN_SEEN) {
    score += weights.neverRecalledBoost;
    reasons.push("never_recalled");
  }

  // Abandoned mid-review: the most recent exposure is an unrated Review reveal
  // (app closed, session expired). Distinct from never_recalled — this is a
  // specific interrupted test, not generic rereading.
  if (candidate.lastOutcome === "read" && candidate.lastShownOrigin === "review_reveal") {
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

  // Tiered staleness: once a term has ever been recalled, staleness anchors to
  // that real test at the highest rate — this is what makes tested recall
  // dominate ranking over passive exposure. Terms never recalled fall back to
  // Seen/Read staleness at smaller rates, with Read (deliberate) above Seen
  // (incidental) — the two tiers never collapse into one bucket.
  if (candidate.recalledCount > 0 && candidate.lastRecalledAt) {
    const hoursSinceRecalled =
      (now.getTime() - candidate.lastRecalledAt.getTime()) / (1000 * 60 * 60);
    const cappedHours = Math.min(hoursSinceRecalled, weights.stalenessCapHours);
    score += cappedHours * weights.recalledStalenessBoostPerHour;
    if (hoursSinceRecalled >= STALE_REASON_THRESHOLD_HOURS) {
      reasons.push("stale");
    }
  } else if (candidate.lastSeenAt) {
    const hoursSinceLastSeen = (now.getTime() - candidate.lastSeenAt.getTime()) / (1000 * 60 * 60);
    const cappedHours = Math.min(hoursSinceLastSeen, weights.stalenessCapHours);
    const perHour =
      candidate.lastOutcome === "read"
        ? weights.readStalenessBoostPerHour
        : weights.seenStalenessBoostPerHour;
    score += cappedHours * perHour;
    if (hoursSinceLastSeen >= STALE_REASON_THRESHOLD_HOURS) {
      reasons.push("stale");
    }
  } else if (candidate.seenCount > 0) {
    // Seen but no timestamp → treat as maximally stale
    score += weights.stalenessCapHours * weights.seenStalenessBoostPerHour;
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
