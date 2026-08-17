/** Scoring weights — single fixed set, no presets. Edit these constants
 *  directly to change the feel.
 *
 *  Two independent systems, two objects:
 *    RANKING  — picks/orders what shows up next in Read/Review/Quiz
 *               (score.ts, pick.ts).
 *    STRENGTH — display-only glance score on collection cards and the
 *               stats page (strength.ts). Never affects ranking.
 */

import type { PickContext, ScoreWeights } from "./types";

export const RANKING = {
  // IANA timezone same-day logic (sit-outs, daily mix counts) is measured against.
  timezone: "Europe/Amsterdam",

  // Minimum lifetime tests before a term's fail rate counts toward ranking priority. Below this, no boost — e.g. 4 tests with 2 fails (50%) adds priority; 2 tests with 1 fail (also 50%) doesn't, too little data yet.
  failRateMinAttempts: 4,

  // Cap on |streak| for any boost that scales per point of it (struggling, cross-fail).
  streakBoostCap: 5,

  // How long a term hides after a good streak, in hours. Higher growthFactor = cooldown grows faster per streak point; capHours is the ceiling no matter how long the streak.
  masteredCooldown: {
    baseHours: 72,
    growthFactor: 1.6,
    capHours: 24 * 14, // 2 weeks
  },

  // Read count before an untested term counts as "engaged but untested" (earns formula.engagedButUntestedBoost).
  engagedMinReadCount: 3,

  // Hours for the staleness boost to mostly ramp up, per context. Lower = that context's boost climbs faster.
  stalenessDecayHours: {
    read: 48,
    review: 36,
    quiz: 24,
  } satisfies Record<PickContext, number>,

  // Hours since last activity before score.ts shows the "stale" badge. Same cutoff for all three contexts.
  staleReasonThresholdHours: 24,

  // The ranking formula's point values — see ScoreWeights in types.ts for what each field gates.
  formula: {
    unseenBoost: 100,
    strugglingBoostPerStreak: 40,
    masteredCooldownPenalty: 120,
    sameDayCooldownPenalty: 120,
    engagedButUntestedBoost: 30,
    abandonedReviewBoost: 45,
    stalenessMaxBoost: 84,
    stalenessCapHours: 168, // 7 days
    crossFailOtherTestBoostPerRepeat: 25,
    fragileBoostMax: 25,
  } satisfies ScoreWeights,

  // How pick.ts interleaves never-engaged vs. already-touched terms. 1:1 alternates; raise neverEngaged to favor new terms, raise alreadyTouched to protect the rotation.
  mixSlots: {
    neverEngaged: 1,
    alreadyTouched: 1,
  },
};

/** Streak-scaled cooldown window: +1 → base; longer streaks earn a longer
 *  window, capped at RANKING.masteredCooldown.capHours. */
export function masteredCooldownHours(streak: number): number {
  if (streak <= 0) return 0;
  const { baseHours, growthFactor, capHours } = RANKING.masteredCooldown;
  const hours = baseHours * Math.pow(growthFactor, streak - 1);
  return Math.min(hours, capHours);
}

export const STRENGTH = {
  // How Review + Quiz sub-scores blend into one score, and how much a streak counts toward it. weights.review > weights.quiz because Quiz is guessable (50% floor) and Review isn't. streakMaxCredit is the streak length for full credit; streakWeight is streak's share of the blend (fail-rate gets the rest).
  blend: {
    weights: { review: 2, quiz: 1 },
    streakMaxCredit: 3,
    streakWeight: 0.6,
  },

  // Assumed fail rate before any real evidence, blended in as `strength` virtual attempts. Higher strength = need more real attempts before trusting a streak's fail rate.
  failRatePrior: {
    strength: 4,
    rate: 0.5,
  },

  // How a term's score fades over time since last activity, scaled by how well-proven it is. tauBaseHours/tauCapHours: decay speed (barely-tested → well-proven). floorBase/floorCap: how low it can fade before stopping.
  staleness: {
    tauBaseHours: 96, // 4 days
    tauCapHours: 480, // 20 days
    floorBase: 0.1,
    floorCap: 0.75,
  },

  // Bonus score from reading a term that's also been tested. max caps it at one bucket-boundary's worth of points — e.g. a weak score of 40 plus 25+ reads (max bonus) can reach 60 (medium), but never jumps two boundaries at once.
  readNudge: {
    max: 20,
    perRead: 4,
  },

  // Score ceiling for a term that's been read but never tested — reads are the only signal here, so this is a separate, higher cap than readNudge. Logarithmic: fast early, flattens by ~15-20 reads.
  untestedRead: {
    ceiling: 50,
    logK: 19,
  },

  // Score cutoffs for the weak/medium/strong label. mediumMinScore and above = medium; strongMinScore and above = strong.
  buckets: {
    mediumMinScore: 55,
    strongMinScore: 75,
  },

  // Score thresholds for the 5-bar UI indicator — one more bar per threshold cleared.
  barScoreThresholds: [35, 55, 75, 95] as const,
};
