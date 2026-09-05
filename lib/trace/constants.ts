/** TRACE tunable parameters — every magic number in the engine, named.
 *  @see docs/trace-formula.md §11 "Default parameters"
 *
 *  These are reasoned defaults, not fit to real usage data yet (§12).
 */

/** §3 Familiarity growth per Read: F' = F + w_f · e^(−k·n). */
export const FAMILIARITY_GROWTH_RATE = 0.3; // w_f
/** §3 Familiarity diminishing-returns rate across repeat reads. */
export const FAMILIARITY_DECAY_RATE = 0.5; // k
/** §3 Cap on F's contribution to mastery — Read alone can't push mastery above this. */
export const FAMILIARITY_CAP = 0.35; // cap_F
/** §3 Familiarity decay scale (days) — faster/shallower than tested memory. */
export const FAMILIARITY_DECAY_SCALE_DAYS = 10;
/** §3 Cold-start difficulty nudge from familiarity: D0' = D0(G) − λD · F₀. */
export const COLD_START_DIFFICULTY_NUDGE = 2; // λD
/** §3 Cold-start stability nudge from familiarity: S0' = S0(G) · (1 + λS · F₀). */
export const COLD_START_STABILITY_NUDGE = 0.5; // λS

/** §4 Recall retrievability/familiarity decay scale multiplier: R(t) = (1 + t/(9·S))⁻¹. */
export const RETRIEVABILITY_DECAY_SCALE = 9;

/** §4 Review grades — recall-before-reveal, FSRS-5 grading. */
export const AGAIN = 1;
export const HARD = 2;
export const GOOD = 3;
export const EASY = 4;

/** §4 FSRS-5 default weights w0–w18. */
export const FSRS_WEIGHTS = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616, 0.1544, 1.0824, 1.9813,
  0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567,
] as const;

/** §5 Bayesian recognition update — quiz slip allowance (still counts as "knows" when correct). */
export const P_CORRECT_GIVEN_KNOWS = 0.95;
/** §5 Guess-rate correction per question type. */
export const P_CORRECT_GIVEN_GUESS_MCQ = 0.25;
export const P_CORRECT_GIVEN_GUESS_TF = 0.5;
/** §5 Untested-term starting prior — used only at the moment of the first answer, never stored. */
export const RECOGNITION_INITIAL_PRIOR = 0.5;
/** §5 Posterior → stability scale: S_g = 1 + k_g · p. */
export const RECOGNITION_STABILITY_SCALE = 15; // k_g
/** §5 Cross-track sanity check on quiz failure: penalty_scale = 1 − 0.5·R_r(t). */
export const QUIZ_FAIL_PENALTY_RECALL_WEIGHT = 0.5;

/** §6 Session cooldown — exclude a term with R(t) above this from the same-session queue. */
export const SESSION_COOLDOWN_RETRIEVABILITY = 0.98;

/** §7 Mastery blend weights: Mastery = wF·F_used + wR·R_r + wG·R_g. */
export const MASTERY_WEIGHT_FAMILIARITY = 0.2; // wF
export const MASTERY_WEIGHT_RECALL = 0.5; // wR
export const MASTERY_WEIGHT_RECOGNITION = 0.3; // wG

/** §7 Confidence discount time constant: confidence(n) = 1 − e^(−n/τ). */
export const CONFIDENCE_TIME_CONSTANT = 3; // τ

/** §9 Known/unknown label thresholds (no hysteresis — see plan's deviation note). */
export const KNOWN_THRESHOLD = 0.8;
export const UNKNOWN_THRESHOLD = 0.6;
/** §9 Minimum test count before a term can be labeled "known" — closes the
 *  gap where confidence(n) alone doesn't stop a single lucky grade from
 *  crossing the known threshold on a brand-new term. */
export const KNOWN_MIN_TEST_COUNT = 3;

/** §10 Read ranking — weight on the mastery-tempering nudge relative to
 *  decay-aware exposure (see rankReadQueue in queue.ts). A reasoned
 *  starting point, meant to be retuned by feel from the debug queue view
 *  once it's live, same as everything else in this file. */
export const READ_TEMPER_WEIGHT = 0.2;

/** Per-collection "time to mastery" insight (Mastery page) — window-widening
 *  ladder for estimating how often terms have recently crossed a mastery
 *  threshold for the first time. Stops at the first window with enough
 *  samples; the widest rung falls back to all-time since the first-ever
 *  crossing of that kind. */
export const PACE_WINDOW_LADDER_DAYS = [3, 7, 14, 30] as const;
/** Minimum crossings within a window before that window's rate is trusted. */
export const PACE_MIN_CROSSINGS = 2;
/** Floor on the all-time rung's elapsed-days denominator, so two crossings
 *  that both just happened can't produce a divide-by-zero/infinite rate. */
export const PACE_MIN_WINDOW_DAYS = 1;
/** Milestone estimate range: point estimate to this multiple of it — the
 *  remaining terms in a collection tend to be the ones a user has been
 *  avoiding or finding harder, so the true time is more likely to run
 *  long than short. */
export const PACE_ESTIMATE_RANGE_MULTIPLIER = 1.5;
/** At or below this many remaining terms, show a literal count instead of
 *  a time estimate — a time-to-clear-2-terms estimate is noise, not signal. */
export const PACE_SMALL_REMAINING_THRESHOLD = 2;
