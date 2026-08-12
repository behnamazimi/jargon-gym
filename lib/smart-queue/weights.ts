/** Scoring weights — single fixed set, no presets.
 *
 *  Presets existed to let a user pick a "mode" without touching code. This
 *  app has one user who *is* the code, so one well-tuned set replaces the
 *  three (balanced/learn_new/drill_weak) — edit these constants directly if
 *  the feel ever needs to change.
 */

import type { PickContext, ScoreWeights } from "./types";

/** Cap on how many consecutive fails count toward the struggling boost. */
export const FAIL_STREAK_CAP = 5;

/** Minimum read count, with zero test count, before engaged_untested applies. */
export const ENGAGED_MIN_COUNT = 3;

/** Minimum own-context attempts before lifetime fail-rate (fragile) applies. */
export const FAIL_RATE_MIN_ATTEMPTS = 4;

/** Base hours after a pass during which a context heavily deprioritizes the
 *  term — scaled up per streak by masteredCooldownHours below. */
export const BASE_COOLDOWN_HOURS = 72;

/** Per-streak-point multiplier on the cooldown window. */
export const COOLDOWN_GROWTH_FACTOR = 1.4;

/** Cooldown window never exceeds this, however high the streak. */
export const COOLDOWN_CAP_HOURS = 24 * 14; // 2 weeks

/** Streak-scaled cooldown window: +1 → base; longer streaks earn a longer
 *  window, capped. Resets to the short end after a fail-then-repass. */
export function masteredCooldownHours(streak: number): number {
  if (streak <= 0) return 0;
  const hours = BASE_COOLDOWN_HOURS * Math.pow(COOLDOWN_GROWTH_FACTOR, streak - 1);
  return Math.min(hours, COOLDOWN_CAP_HOURS);
}

/** IANA timezone for same-day cooldowns (calendar day, not a fixed hour window). */
export const QUEUE_TIMEZONE = "Europe/Amsterdam";

/** Per-context decay constant (τ) for the staleness curve — smaller means the
 *  boost front-loads faster. Quiz stales fastest, Read slowest. */
export const STALENESS_DECAY_HOURS: Record<PickContext, number> = {
  read: 48,
  review: 36,
  quiz: 24,
};

export const WEIGHTS: ScoreWeights = {
  unseenBoost: 100,
  strugglingBoostPerStreak: 40,
  masteredCooldownPenalty: 120,
  sameDayCooldownPenalty: 120,
  engagedButUntestedBoost: 30,
  abandonedReviewBoost: 45,
  newTermBoost: 30,
  stalenessMaxBoost: 84, // former ceiling: 0.5 * 168h cap
  stalenessCapHours: 168, // 7 days
  crossFailOtherTestBoostPerRepeat: 25,
  fragileBoostMax: 25,
};
