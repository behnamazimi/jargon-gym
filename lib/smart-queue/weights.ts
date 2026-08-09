/** Scoring weights — single fixed set, no presets.
 *
 *  Presets existed to let a user pick a "mode" without touching code. This
 *  app has one user who *is* the code, so one well-tuned set replaces the
 *  three (balanced/learn_new/drill_weak) — edit these constants directly if
 *  the feel ever needs to change.
 */

import type { ScoreWeights } from "./types";

/** Cap on how many consecutive fails count toward the struggling boost. */
export const FAIL_STREAK_CAP = 5;

/** Minimum read count, with zero test count, before engaged_untested applies. */
export const ENGAGED_MIN_COUNT = 3;

/** Hours after a pass during which a context heavily deprioritizes the term. */
export const SOLID_COOLDOWN_HOURS = 72;

export const WEIGHTS: ScoreWeights = {
  unseenBoost: 100,
  strugglingBoostPerStreak: 40,
  masteredCooldownPenalty: 120,
  engagedButUntestedBoost: 30,
  abandonedReviewBoost: 45,
  newTermBoost: 30,
  stalenessBoostPerHour: 0.5,
  stalenessCapHours: 168, // 7 days
  crossFailReadBoost: 20,
  crossFailOtherTestBoost: 25,
};
