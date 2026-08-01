/** Scoring weight presets for different review strategies.
 *  KEEP IN SYNC with lib/smart-queue/presets.ts
 */

import type { ReviewPreset, ScoreWeights } from "./types.ts";

const BALANCED_WEIGHTS: ScoreWeights = {
  unseenBoost: 100,
  learningBoost: 50,
  forgotBoost: 80,
  newTermBoost: 30,
  seenCountPenalty: 10,
  stalenessBoostPerHour: 0.5,
  stalenessCapHours: 168, // 7 days
};

const LEARN_NEW_WEIGHTS: ScoreWeights = {
  unseenBoost: 150,
  learningBoost: 40,
  forgotBoost: 70,
  newTermBoost: 60,
  seenCountPenalty: 15,
  stalenessBoostPerHour: 0.3,
  stalenessCapHours: 168,
};

const DRILL_WEAK_WEIGHTS: ScoreWeights = {
  unseenBoost: 80,
  learningBoost: 100,
  forgotBoost: 120,
  newTermBoost: 20,
  seenCountPenalty: 8,
  stalenessBoostPerHour: 0.7,
  stalenessCapHours: 168,
};

export function getPresetWeights(preset: ReviewPreset): ScoreWeights {
  switch (preset) {
    case "balanced":
      return BALANCED_WEIGHTS;
    case "learn_new":
      return LEARN_NEW_WEIGHTS;
    case "drill_weak":
      return DRILL_WEAK_WEIGHTS;
  }
}
