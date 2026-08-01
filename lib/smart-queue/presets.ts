/** Scoring weight presets for different review strategies.
 */

import type { PickContext, ReviewPreset, ScoreWeights } from "./types";

/** Hours after a solid outcome during which active picks heavily deprioritize the term. */
export const SOLID_COOLDOWN_HOURS = 72;

/** Minimum seen_count for shown-without-solid (stuck) boost. */
export const SHOWN_WITHOUT_SOLID_MIN_SEEN = 3;

/** Quiz context multiplier for weak-signal weights (learning / forgot / shown_stuck). */
const QUIZ_WEAK_MULTIPLIER = 1.5;

const BALANCED_WEIGHTS: ScoreWeights = {
  unseenBoost: 100,
  learningBoost: 50,
  forgotBoost: 80,
  newTermBoost: 30,
  shownWithoutSolidBoost: 30,
  solidCooldownPenalty: 120,
  seenCountPenalty: 10,
  stalenessBoostPerHour: 0.5,
  stalenessCapHours: 168, // 7 days
};

const LEARN_NEW_WEIGHTS: ScoreWeights = {
  unseenBoost: 150,
  learningBoost: 40,
  forgotBoost: 70,
  newTermBoost: 60,
  shownWithoutSolidBoost: 25,
  solidCooldownPenalty: 120,
  seenCountPenalty: 15,
  stalenessBoostPerHour: 0.3,
  stalenessCapHours: 168,
};

const DRILL_WEAK_WEIGHTS: ScoreWeights = {
  unseenBoost: 80,
  learningBoost: 100,
  forgotBoost: 120,
  newTermBoost: 20,
  shownWithoutSolidBoost: 40,
  solidCooldownPenalty: 120,
  seenCountPenalty: 8,
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
    shownWithoutSolidBoost: base.shownWithoutSolidBoost * QUIZ_WEAK_MULTIPLIER,
  };
}
