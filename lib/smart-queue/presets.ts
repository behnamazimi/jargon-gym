/** Scoring weight presets for different review strategies.
 */

import type { PickContext, ReviewPreset, ScoreWeights } from "./types";

/** Hours after a solid outcome during which active picks heavily deprioritize the term. */
export const SOLID_COOLDOWN_HOURS = 72;

/** Minimum seen_count, with zero recalls, before the never-recalled/browse-only boost applies. */
export const NEVER_RECALLED_MIN_SEEN = 3;

/** Cap on how many consecutive fails count toward the fail-streak boost. */
export const FAIL_STREAK_CAP = 5;

/** Quiz context multiplier for weak-signal weights (learning / forgot / never_recalled / browse_only / abandoned_review / fail streak). */
const QUIZ_WEAK_MULTIPLIER = 1.5;

const BALANCED_WEIGHTS: ScoreWeights = {
  unseenBoost: 100,
  learningBoost: 50,
  forgotBoost: 80,
  newTermBoost: 30,
  neverRecalledBoost: 30,
  browseOnlyBoost: 15,
  abandonedReviewBoost: 45,
  failStreakBoostPerRepeat: 15,
  solidCooldownPenalty: 120,
  seenCountPenalty: 1,
  stalenessBoostPerHour: 0.5,
  stalenessCapHours: 168, // 7 days
};

const LEARN_NEW_WEIGHTS: ScoreWeights = {
  unseenBoost: 150,
  learningBoost: 40,
  forgotBoost: 70,
  newTermBoost: 60,
  neverRecalledBoost: 25,
  browseOnlyBoost: 12,
  abandonedReviewBoost: 35,
  failStreakBoostPerRepeat: 10,
  solidCooldownPenalty: 120,
  seenCountPenalty: 1,
  stalenessBoostPerHour: 0.3,
  stalenessCapHours: 168,
};

const DRILL_WEAK_WEIGHTS: ScoreWeights = {
  unseenBoost: 80,
  learningBoost: 100,
  forgotBoost: 120,
  newTermBoost: 20,
  neverRecalledBoost: 40,
  browseOnlyBoost: 20,
  abandonedReviewBoost: 55,
  failStreakBoostPerRepeat: 25,
  solidCooldownPenalty: 120,
  seenCountPenalty: 1,
  stalenessBoostPerHour: 0.7,
  stalenessCapHours: 168,
};

function getPresetWeights(preset: ReviewPreset): ScoreWeights {
  switch (preset) {
    case "balanced":
      return BALANCED_WEIGHTS;
    case "learn_new":
      return LEARN_NEW_WEIGHTS;
    case "drill_weak":
      return DRILL_WEAK_WEIGHTS;
  }
}

/** Apply session-context overrides without mutating the user's saved preset. */
export function getContextWeights(preset: ReviewPreset, context: PickContext): ScoreWeights {
  const base = getPresetWeights(preset);
  if (context !== "quiz") {
    return base;
  }

  return {
    ...base,
    learningBoost: base.learningBoost * QUIZ_WEAK_MULTIPLIER,
    forgotBoost: base.forgotBoost * QUIZ_WEAK_MULTIPLIER,
    neverRecalledBoost: base.neverRecalledBoost * QUIZ_WEAK_MULTIPLIER,
    browseOnlyBoost: base.browseOnlyBoost * QUIZ_WEAK_MULTIPLIER,
    abandonedReviewBoost: base.abandonedReviewBoost * QUIZ_WEAK_MULTIPLIER,
    failStreakBoostPerRepeat: base.failStreakBoostPerRepeat * QUIZ_WEAK_MULTIPLIER,
  };
}
