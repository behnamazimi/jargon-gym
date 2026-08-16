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

/** Per-streak-point multiplier on the cooldown window. SM-2-style ease
 *  factors (~2.5) would collapse streak 3+ into one bucket given the 2-week
 *  cap below — 1.6 keeps 5 distinct pre-cap levels while still growing
 *  faster than the previous 1.4. */
export const COOLDOWN_GROWTH_FACTOR = 1.6;

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
  stalenessMaxBoost: 84, // former ceiling: 0.5 * 168h cap
  stalenessCapHours: 168, // 7 days
  crossFailOtherTestBoostPerRepeat: 25,
  fragileBoostMax: 25,
};

/** Never-engaged slots per mix cycle when both lanes have eligible terms.
 *  Paired with MIX_ALREADY_TOUCHED_SLOTS. 1:1 (these defaults) alternates
 *  unread with already-touched. To prefer new terms, raise this one
 *  (e.g. 2 and 1 → two never-engaged, then one already-touched). To
 *  protect the rotation more, raise the other (e.g. 1 and 2). If one
 *  lane empties, the other fills the rest of the pick. */
export const MIX_NEVER_ENGAGED_SLOTS = 1;

/** Already-touched slots per mix cycle (struggling/stale/steady).
 *  See MIX_NEVER_ENGAGED_SLOTS for how the pair sets the ratio. */
export const MIX_ALREADY_TOUCHED_SLOTS = 1;

/** Overall-strength composite weights (review weighted higher — quiz has a
 *  50% guess floor, review does not; see docs/smart-queue.md). Display-only,
 *  glance-surface score — first-pass constants, tune later via the debug
 *  footer, not analytically. */
export const OVERALL_WEIGHTS = { review: 2, quiz: 1 };

/** Decay constant (τ, hours) for the overall-strength staleness multiplier,
 *  measured from the most recent activity across read/review/quiz. Separate
 *  from STALENESS_DECAY_HOURS (per-PickContext, feeds the ranking score —
 *  this one is display-only).
 *
 *  τ is evidence-scaled, not flat: it interpolates between these two bounds
 *  by how strong the pre-decay blended score is (see
 *  overallStalenessDecayHours in strength.ts) — a single old pass fades
 *  fast, a well-proven term stays trusted for weeks. A flat τ made every
 *  term decay at the same rate regardless of how much evidence backed it,
 *  which crushed a real pass down to the same near-zero score a barely-
 *  tested term would get at the same staleness. */
export const OVERALL_STALENESS_TAU_BASE_HOURS = 96; // 4 days — weak/near-zero evidence
export const OVERALL_STALENESS_TAU_CAP_HOURS = 480; // 20 days — near-100 evidence

/** Floor on the staleness multiplier itself (proportional, not an absolute
 *  score floor) — a real tested pass never fully decays to "indistinguishable
 *  from untested," but weak evidence still ends up much lower than strong
 *  evidence once both hit the floor. */
export const OVERALL_STALENESS_MULTIPLIER_FLOOR = 0.2;

/** Read-nudge shape for overall strength: diminishing returns, capped well
 *  under the smallest bucket gap (15-20 points) so it can never alone cross
 *  a boundary. */
export const OVERALL_READ_NUDGE_MAX = 6;
export const OVERALL_READ_NUDGE_PER_READ = 1.5; // via sqrt(readCount), see strength.ts
