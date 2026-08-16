/** Scoring weights — single fixed set, no presets.
 *
 *  Presets existed to let a user pick a "mode" without touching code. This
 *  app has one user who *is* the code, so one well-tuned set replaces the
 *  three (balanced/learn_new/drill_weak) — edit these constants directly if
 *  the feel ever needs to change.
 *
 *  Three independent systems live in this file. A constant only affects its
 *  own system unless its comment says otherwise:
 *    1. Shared      — read by more than one system below.
 *    2. Ranking     — picks/orders what shows up next in Read/Review/Quiz
 *                     (score.ts, pick.ts).
 *    3. Strength    — display-only glance score on collection cards and the
 *                     stats page (strength.ts). Never affects ranking.
 */

import type { PickContext, ScoreWeights } from "./types";

// ============================================================================
// 1. Shared
// ============================================================================

/** Minimum attempts before a lifetime fail-rate is trusted at all, below
 *  which it reads as 0 rather than a noisy small-sample rate. Shared by
 *  ranking's fragile boost and both strength calculations — bump this once,
 *  it tightens the bar everywhere fail-rate is trusted. */
export const FAIL_RATE_MIN_ATTEMPTS = 4;

/** IANA timezone all same-day logic is measured against (calendar day, not
 *  a fixed hour window). Used by ranking's same-day sit-outs and the mix
 *  lane's daily counts. */
export const QUEUE_TIMEZONE = "Europe/Amsterdam";

// ============================================================================
// 2. Ranking — score.ts's formula, pick.ts's lane mix
// ============================================================================

// --- Streak & mastery cooldown -------------------------------------------

/** Cap on |streak| magnitude wherever a boost scales per point of it — both
 *  the struggling boost (own negative streak) and the cross-fail boost
 *  (other activity's negative streak) use this same cap. */
export const STREAK_BOOST_CAP = 5;

/** Mastered-cooldown window: how long a context sits out after a pass,
 *  scaled by streak via masteredCooldownHours() below. */
export const MASTERED_COOLDOWN_BASE_HOURS = 72;
/** Per-streak-point multiplier on the cooldown window. SM-2-style ease
 *  factors (~2.5) would collapse streak 3+ into one bucket given the 2-week
 *  cap below — 1.6 keeps 5 distinct pre-cap levels while still growing
 *  faster than the previous 1.4. */
export const MASTERED_COOLDOWN_GROWTH_FACTOR = 1.6;
/** Cooldown window never exceeds this, however high the streak. */
export const MASTERED_COOLDOWN_CAP_HOURS = 24 * 14; // 2 weeks

/** Streak-scaled cooldown window: +1 → base; longer streaks earn a longer
 *  window, capped. Resets to the short end after a fail-then-repass. Distinct
 *  from RANKING_WEIGHTS.sameDayCooldownPenalty below (a flat same-day-only
 *  penalty, not a growing window) — "mastered" here means "recently aced,"
 *  not "same day." */
export function masteredCooldownHours(streak: number): number {
  if (streak <= 0) return 0;
  const hours =
    MASTERED_COOLDOWN_BASE_HOURS * Math.pow(MASTERED_COOLDOWN_GROWTH_FACTOR, streak - 1);
  return Math.min(hours, MASTERED_COOLDOWN_CAP_HOURS);
}

// --- Staleness -------------------------------------------------------------

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

// --- Formula point values ---------------------------------------------------

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

// --- Lane mix (pick.ts, post-score interleaving) ----------------------------

/** Never-engaged slots per mix cycle when both lanes have eligible terms.
 *  Paired with MIX_ALREADY_TOUCHED_SLOTS — this is lane interleaving in
 *  pick.ts, not part of the score formula itself. 1:1 (these defaults)
 *  alternates unread with already-touched. To prefer new terms, raise this
 *  one (e.g. 2 and 1 → two never-engaged, then one already-touched). To
 *  protect the rotation more, raise the other (e.g. 1 and 2). If one lane
 *  empties, the other fills the rest of the pick. */
export const MIX_NEVER_ENGAGED_SLOTS = 1;

/** Already-touched slots per mix cycle (struggling/stale/steady).
 *  See MIX_NEVER_ENGAGED_SLOTS above for how the pair sets the ratio. */
export const MIX_ALREADY_TOUCHED_SLOTS = 1;

// ============================================================================
// 3. Strength — display-only glance score (strength.ts's
//    computeOverallStrength), collection cards + the stats page. Never
//    feeds the ranking formula above. First-pass constants throughout —
//    tune later via the debug footer, not analytically.
// ============================================================================

// --- Blending ----------------------------------------------------------------

/** Composite weights blending Review + Quiz sub-scores — Review weighted
 *  higher since Quiz has a 50% guess floor and Review does not (see
 *  docs/smart-queue.md). */
export const OVERALL_WEIGHTS = { review: 2, quiz: 1 };

// --- Staleness decay -----------------------------------------------------

/** Evidence-scaled staleness decay (τ, hours), measured from the most
 *  recent activity across read/review/quiz — one global clock, not three
 *  per-context ones (see RANKING_STALENESS_DECAY_HOURS in section 2 for why
 *  that's different). τ interpolates between these two bounds by how strong
 *  the pre-decay blended score is (overallStalenessDecayHours in
 *  strength.ts): a single old pass fades fast, a well-proven term stays
 *  trusted for weeks. A flat τ made every term decay at the same rate
 *  regardless of evidence, crushing a real pass to the same near-zero score
 *  a barely-tested term would get at the same staleness. */
export const OVERALL_STALENESS_TAU_BASE_HOURS = 96; // 4 days — weak/near-zero evidence
export const OVERALL_STALENESS_TAU_CAP_HOURS = 480; // 20 days — near-100 evidence

/** Floor on the staleness multiplier itself (proportional, not an absolute
 *  score floor) — a real tested pass never fully decays to "indistinguishable
 *  from untested," but weak evidence still ends up much lower than strong
 *  evidence once both hit the floor. */
export const OVERALL_STALENESS_MULTIPLIER_FLOOR = 0.2;

// --- Read nudge (untested exposure) ------------------------------------------

/** Read-nudge shape: diminishing returns (scales by sqrt(readCount), see
 *  strength.ts), capped well under the smallest bucket gap (15-20 points)
 *  so it can never alone cross a boundary. Bumped up from 6/1.5 — Read
 *  exposure was barely moving the score even at double-digit read counts. */
export const OVERALL_READ_NUDGE_MAX = 20;
export const OVERALL_READ_NUDGE_PER_READ = 4;

// --- Bucket labels (weak / medium / strong) ----------------------------------

/** Score (0-100) at/above which a tested term counts as `medium` instead of
 *  `weak`. Below this is `weak`. `unverified` bypasses both cutoffs
 *  entirely (see computeOverallStrength) — these only apply once a term
 *  has been tested at least once. Edit these two directly to change what
 *  score counts as which tier. */
export const OVERALL_BUCKET_MEDIUM_MIN_SCORE = 55;
/** Score (0-100) at/above which a tested term counts as `strong` instead of
 *  `medium`. */
export const OVERALL_BUCKET_STRONG_MIN_SCORE = 75;

// --- Bar thresholds (5-bar UI indicator) -------------------------------------

/** Score (0-100) thresholds for the 5-bar UI indicator — a tested score
 *  always shows at least 1 bar; each entry here is the minimum score for
 *  one more bar. Finer-grained than, and independent of, the weak/medium/
 *  strong cutoffs above (bar count drives the visual, not the bucket
 *  label). */
export const OVERALL_BAR_SCORE_THRESHOLDS = [35, 55, 75, 95] as const;

/** Score thresholds for `unverified`'s own bar scale — read-only scores
 *  never exceed OVERALL_READ_NUDGE_MAX (20), far below the tested scale's
 *  first threshold (35), so sharing OVERALL_BAR_SCORE_THRESHOLDS would
 *  pin every unverified term at 1 bar forever regardless of read count or
 *  staleness. This scale is sized to that 0-20 range instead, so exposure
 *  and recency can actually move the bar count. Only 2 entries (vs. 4 for
 *  tested scores) deliberately caps unverified at 3 bars max — exposure
 *  alone should never look as "full" as a genuinely tested term, even
 *  before noticing the bucket's gray color. */
export const OVERALL_UNVERIFIED_BAR_SCORE_THRESHOLDS = [5, 10] as const;
