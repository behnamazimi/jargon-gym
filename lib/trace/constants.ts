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

/** §4 Recall forgetting curve, as in FSRS-5: R(t) = (1 + RECALL_CURVE_FACTOR·t/S)^RECALL_CURVE_DECAY.
 *  The factor makes R = 0.9 exactly when t = S, so S reads as "days until a 90% chance". */
export const RECALL_CURVE_DECAY = -0.5;
export const RECALL_CURVE_FACTOR = 0.9 ** (1 / RECALL_CURVE_DECAY) - 1; // 19/81

/** §5 Recognition retrievability decay scale multiplier: R_g(t) = (1 + t/(9·S_g))⁻¹. */
export const RECOGNITION_DECAY_SCALE = 9;

/** §4 Review grades — recall-before-reveal, FSRS-5 grading. */
export const AGAIN = 1;
export const HARD = 2;
export const GOOD = 3;
export const EASY = 4;

/** §4 FSRS-5 weights w0–w18. Six differ from the FSRS-5 defaults on purpose
 *  (2026-10-10): the defaults are fit to Anki users, and with them a few Goods
 *  sent a term away for years while Again and Hard barely brought it back.
 *  The changed ones make well-known terms move away more slowly and misses
 *  pull terms back harder, with no caps anywhere. */
export const FSRS_WEIGHTS = [
  0.2, // w0, first-ever Again stability. FSRS-5: 0.4072.
  0.7, // w1, first-ever Hard stability. FSRS-5: 1.1829.
  3.1262,
  7, // w3, first-ever Easy stability. FSRS-5: 15.4722 (back in ~25 days at the target).
  7.2102,
  0.5316,
  1.0651,
  0.0234,
  1.616,
  0.626, // w9, diminishing returns: the stronger a term, the less a success adds. FSRS-5: 0.1544.
  1.0824,
  0.2972, // w11, how much a lapse keeps. FSRS-5: 1.9813 (this is 15% of it).
  0.0953,
  0.2975,
  2.2042,
  0.2407, // w15, unused: Hard blends Again and Good instead (HARD_LAPSE_BLEND).
  1.6, // w16, Easy bonus over Good. FSRS-5: 2.9466.
  0.5034,
  0.6567,
] as const;

/** §4 Same-day gains shrink as a term gets stronger: the stability multiplier is
 *  scaled by S^-w19, as in FSRS-6's same-day formula (its default w19, 0.0658,
 *  paired with TRACE's own w17/w18; not fitted to our data). */
export const SAME_DAY_STABILITY_DECAY = 0.0658;

/** A missed term is re-asked in the same session up to this many times. */
export const LEARNING_STEP_MAX_RETRIES = 3;

/** A retry is only treated as a learning step when the term was graded within
 *  this many minutes, so a stray flag can't skip counting a real test. */
export const LEARNING_STEP_WINDOW_MINUTES = 60;

/** §4 Hard is a partial recall, so its stability sits between what Again and
 *  Good would give: S_hard = S_again^h · S_good^(1−h). At 0.85 it leans toward
 *  Again, so Hard pulls a strong term back and holds a fragile one in place.
 *  Stock FSRS-5 treats Hard as a weaker success that always grows stability. */
export const HARD_LAPSE_BLEND = 0.85;

/** Hard never leaves a term with less than this share of its stability
 *  (2026-10-15). The blend above alone dropped any term, even one that had
 *  lasted two months, to about a day. Young terms still come back in a day,
 *  which matches real grades (about 80% recalled a day after a Hard). */
export const HARD_MIN_KEEP = 0.5;

/** §5 Bayesian recognition update — quiz slip allowance (still counts as "knows" when correct). */
export const P_CORRECT_GIVEN_KNOWS = 0.95;
/** How a quiz answer was given; each has its own guess rate below. */
export const QUESTION_TYPES = ["multiple_choice", "true_false", "typed", "dictation"] as const;

/** §5 Guess-rate correction per question type. */
export const P_CORRECT_GIVEN_GUESS_MCQ = 0.25;
export const P_CORRECT_GIVEN_GUESS_TF = 0.5;
/** Typing the word is strong evidence; not zero, so one pass can't saturate the posterior. */
export const P_CORRECT_GIVEN_GUESS_TYPED = 0.05;
/** Spelling a word you just heard shows you can hear and write it, not that you
 *  know its meaning, so it counts about as much as multiple choice. */
export const P_CORRECT_GIVEN_GUESS_DICTATION = 0.25;
/** §5 Untested-term starting prior — used only at the moment of the first answer, never stored. */
export const RECOGNITION_INITIAL_PRIOR = 0.5;
/** §5 Posterior → stability scale: S_g = 1 + k_g · p. */
export const RECOGNITION_STABILITY_SCALE = 15; // k_g
/** §5 Cross-track sanity check on quiz failure: penalty_scale = 1 − 0.5·R_r(t). */
export const QUIZ_FAIL_PENALTY_RECALL_WEIGHT = 0.5;

/** §6 Session cooldown — exclude a term with R(t) above this from the same-session queue. */
export const SESSION_COOLDOWN_RETRIEVABILITY = 0.98;

/** §10 Where a never-graded term sits in Review's queue: it is ranked as if
 *  its recall retrievability were this. It works as Review's target: a learned
 *  term comes back once it decays below it, ahead of new terms, and terms above
 *  it wait behind new ones. Raised from 0.7 to 0.89 (2026-10-10): at 0.7 a term
 *  was only shown once it was 30% likely to be forgotten, which made every wait
 *  about four times FSRS's and let each Good grow stability more. At 0.89 a term
 *  is back once it is 11% likely to be forgotten. Picked with the weights above
 *  from a simulated 90 days of 40 and 100 reviews a day (see docs/trace.md). */
export const UNTESTED_RECALL_RETRIEVABILITY = 0.89;

/** §10 The same line for Quiz, on recognition retrievability. Recognition
 *  stability tops out at 1 + RECOGNITION_STABILITY_SCALE days, so a higher line
 *  would bring every quizzed term back within about two weeks. Picked from a
 *  simulated sweep of 0.3–0.8; retune from real quiz data. */
export const UNTESTED_RECOGNITION_RETRIEVABILITY = 0.7;

/** §7 Mastery reads each track this many days ahead, so it answers "will you
 *  still know this in two weeks?" rather than "did you just answer it?". Any
 *  answer, right or wrong, sets retrievability to 1, so reading it now let a
 *  just-failed term look mastered (2026-10-15). */
export const MASTERY_HORIZON_DAYS = 14;

/** §7 Recall and recognition are combined as a weighted geometric mean,
 *  R_r^wR · K_g^wG, so the weaker one pulls mastery down. The 5:3 ratio is the
 *  original design's 0.5/0.3. */
export const MASTERY_WEIGHT_RECALL = 0.625; // wR
export const MASTERY_WEIGHT_RECOGNITION = 0.375; // wG

/** §7 A track with no tests yet counts as a coin flip, not as 0. With it, a
 *  term never quizzed tops out at 0.5^wG ≈ 0.77, below KNOWN_THRESHOLD, so a
 *  passed quiz is what lifts a term to Known. */
export const UNTESTED_TRACK_EVIDENCE = 0.5;

/** §7 Reading fills this share of what recall is missing, scaled by
 *  familiarity: R' = R_r + w·F_used·(1 − R_r). A fixed slice for reading put
 *  part of the score out of reach unless the term was read again; this way it
 *  helps weak terms more. It lifts recall only, so a term never quizzed still
 *  can't reach Known. */
export const READ_GAP_WEIGHT = 0.3;

/** §7 Confidence discount time constant: confidence(n) = 1 − e^(−n/τ).
 *  Lowered from 3 to 2 (2026-09-05): at τ=3, reaching KNOWN_THRESHOLD
 *  required ~7-8 correct grades on a term (7-10 weeks of real usage,
 *  since each successful FSRS grade grows stability and lengthens the
 *  wait before the term is due again). τ=2 needs ~4 correct grades
 *  instead — this only reshapes the label's confidence curve, not
 *  ranking or the underlying memory model. Lowered again to 1 (2026-10-15):
 *  mastery now reads stability two weeks ahead, which already carries the
 *  evidence, and counting misses as tests had propped fail-heavy terms up. */
export const CONFIDENCE_TIME_CONSTANT = 1; // τ

/** §9 Known/unknown label thresholds (no hysteresis — see plan's deviation note).
 *  KNOWN_THRESHOLD lowered from 0.8 to 0.75 (2026-09-05) alongside the
 *  CONFIDENCE_TIME_CONSTANT change above, as part of the same
 *  time-to-mastery recalibration. Set to 0.78 (2026-10-15) for the
 *  two-week mastery: in simulation terms it marks Known still had about 87%
 *  recall three weeks later. */
export const KNOWN_THRESHOLD = 0.78;
export const UNKNOWN_THRESHOLD = 0.6;
/** §9 Minimum test count before a term can be labeled "known" — closes the
 *  gap where confidence(n) alone doesn't stop a single lucky grade from
 *  crossing the known threshold on a brand-new term. */
export const KNOWN_MIN_TEST_COUNT = 3;

/** §10 Read ranking — weight on the mastery-tempering nudge relative to
 *  decay-aware exposure (see rankReadQueue in queue.ts). A reasoned
 *  starting point, meant to be retuned by feel once it's
 *  live, same as everything else in this file. */
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
