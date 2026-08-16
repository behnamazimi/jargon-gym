/** Scoring weights — single fixed set, no presets.
 *
 *  Presets existed to let a user pick a "mode" without touching code. This
 *  app has one user who *is* the code, so one well-tuned set replaces the
 *  three (balanced/learn_new/drill_weak) — edit these constants directly if
 *  the feel ever needs to change.
 *
 *  Three independent systems live in this file — a constant only affects
 *  its own section unless a comment says otherwise:
 *    1. Shared thresholds  — read by more than one of the systems below.
 *    2. Ranking            — picks/orders what shows up next in Read/Review/
 *                             Quiz (score.ts, pick.ts). RANKING_WEIGHTS.
 *    3. Overall strength   — display-only glance score on collection cards
 *                             and the stats page (strength.ts). Never
 *                             affects ranking.
 */

import type { PickContext, ScoreWeights } from "./types";

// ---------------------------------------------------------------------------
// 1. Shared thresholds
// ---------------------------------------------------------------------------

/** Minimum attempts before a lifetime fail-rate is trusted at all, below
 *  which it reads as 0 rather than a noisy small-sample rate. Read by
 *  ranking's fragile boost (score.ts) AND both strength calculations
 *  (strength.ts's per-context computeStrength and the blended
 *  computeOverallStrength) — bump this in one place, it tightens the bar
 *  everywhere fail-rate is trusted. */
export const FAIL_RATE_MIN_ATTEMPTS = 4;

/** IANA timezone all same-day logic is measured against (calendar day, not
 *  a fixed hour window) — ranking's same-day sit-outs (score.ts, pick.ts)
 *  and mix-lane daily counts (pick.ts). */
export const QUEUE_TIMEZONE = "Europe/Amsterdam";

// ---------------------------------------------------------------------------
// 2. Ranking — what shows up next (score.ts's formula, pick.ts's lane mix)
// ---------------------------------------------------------------------------

/** Cap on |streak| magnitude wherever a boost scales per point of it —
 *  the struggling boost (own negative streak) and the cross-fail boost
 *  (other activity's negative streak) both use this same cap. */
export const STREAK_BOOST_CAP = 5;

/** Read count (with zero test count) before a term counts as
 *  "engaged but untested" and earns RANKING_WEIGHTS.engagedButUntestedBoost. */
export const ENGAGED_MIN_READ_COUNT = 3;

/** Per-context decay constant (τ, hours) for the ranking staleness boost —
 *  smaller means the boost front-loads faster. Quiz stales fastest, Read
 *  slowest. Feeds RANKING_WEIGHTS.stalenessMaxBoost/stalenessCapHours below.
 *  Unrelated to the OVERALL_STALENESS_* trio in section 3 — that one decays
 *  a display score, this one boosts ranking priority, and they run on
 *  different clocks for different reasons. */
export const RANKING_STALENESS_DECAY_HOURS: Record<PickContext, number> = {
  read: 48,
  review: 36,
  quiz: 24,
};

/** Mastered-cooldown window: how long a context sits out after a pass,
 *  scaled by streak via masteredCooldownHours() below. Distinct from
 *  RANKING_WEIGHTS.sameDayCooldownPenalty (a flat same-day-only penalty,
 *  not a growing window) — "mastered" here means "recently aced," not
 *  "same day." */
export const MASTERED_COOLDOWN_BASE_HOURS = 72;
/** Per-streak-point multiplier on the cooldown window. SM-2-style ease
 *  factors (~2.5) would collapse streak 3+ into one bucket given the 2-week
 *  cap below — 1.6 keeps 5 distinct pre-cap levels while still growing
 *  faster than the previous 1.4. */
export const MASTERED_COOLDOWN_GROWTH_FACTOR = 1.6;
/** Cooldown window never exceeds this, however high the streak. */
export const MASTERED_COOLDOWN_CAP_HOURS = 24 * 14; // 2 weeks

/** Streak-scaled cooldown window: +1 → base; longer streaks earn a longer
 *  window, capped. Resets to the short end after a fail-then-repass. */
export function masteredCooldownHours(streak: number): number {
  if (streak <= 0) return 0;
  const hours =
    MASTERED_COOLDOWN_BASE_HOURS * Math.pow(MASTERED_COOLDOWN_GROWTH_FACTOR, streak - 1);
  return Math.min(hours, MASTERED_COOLDOWN_CAP_HOURS);
}

/** The ranking formula's point values — see ScoreWeights in types.ts for
 *  what each field gates. Consumed by score.ts's scoreCandidate via
 *  pick.ts; also read once by strength.ts's computeStrength
 *  (stalenessCapHours only, to decide "recent enough to call strong"). */
export const RANKING_WEIGHTS: ScoreWeights = {
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
 *  Paired with MIX_ALREADY_TOUCHED_SLOTS — post-score lane interleaving in
 *  pick.ts, not part of the score formula itself. 1:1 (these defaults)
 *  alternates unread with already-touched. To prefer new terms, raise this
 *  one (e.g. 2 and 1 → two never-engaged, then one already-touched). To
 *  protect the rotation more, raise the other (e.g. 1 and 2). If one lane
 *  empties, the other fills the rest of the pick. */
export const MIX_NEVER_ENGAGED_SLOTS = 1;

/** Already-touched slots per mix cycle (struggling/stale/steady).
 *  See MIX_NEVER_ENGAGED_SLOTS for how the pair sets the ratio. */
export const MIX_ALREADY_TOUCHED_SLOTS = 1;

// ---------------------------------------------------------------------------
// 3. Overall strength — display-only glance score (strength.ts's
//    computeOverallStrength), collection cards + the stats page. Never
//    feeds the ranking formula above. First-pass constants throughout —
//    tune later via the debug footer, not analytically.
// ---------------------------------------------------------------------------

/** Composite weights blending Review + Quiz sub-scores — Review weighted
 *  higher since Quiz has a 50% guess floor and Review does not (see
 *  docs/smart-queue.md). */
export const OVERALL_WEIGHTS = { review: 2, quiz: 1 };

/** Evidence-scaled staleness decay (τ, hours), measured from the most
 *  recent activity across read/review/quiz — one global clock, not three
 *  per-context ones (see RANKING_STALENESS_DECAY_HOURS above for why that's
 *  different). τ interpolates between these two bounds by how strong the
 *  pre-decay blended score is (overallStalenessDecayHours in strength.ts):
 *  a single old pass fades fast, a well-proven term stays trusted for
 *  weeks. A flat τ made every term decay at the same rate regardless of
 *  evidence, crushing a real pass to the same near-zero score a barely-
 *  tested term would get at the same staleness. */
export const OVERALL_STALENESS_TAU_BASE_HOURS = 96; // 4 days — weak/near-zero evidence
export const OVERALL_STALENESS_TAU_CAP_HOURS = 480; // 20 days — near-100 evidence

/** Floor on the staleness multiplier itself (proportional, not an absolute
 *  score floor) — a real tested pass never fully decays to "indistinguishable
 *  from untested," but weak evidence still ends up much lower than strong
 *  evidence once both hit the floor. */
export const OVERALL_STALENESS_MULTIPLIER_FLOOR = 0.2;

/** Read-nudge shape: diminishing returns (scales by sqrt(readCount), see
 *  strength.ts), capped well under the smallest bucket gap (15-20 points)
 *  so it can never alone cross a boundary. */
export const OVERALL_READ_NUDGE_MAX = 6;
export const OVERALL_READ_NUDGE_PER_READ = 1.5;
