/** §4 Recall trace (S_r, D_r) — from Review. FSRS-5 with recall-before-reveal
 *  grades, retuned weights (see FSRS_WEIGHTS) and one changed rule: Hard blends
 *  the Again and Good outcomes (HARD_LAPSE_BLEND). S_r/D_r are null until the first Review —
 *  see §4b and applyReviewGrade below for the nullable-state / cold-start
 *  handoff from Familiarity. */

import {
  AGAIN,
  COLD_START_DIFFICULTY_NUDGE,
  COLD_START_STABILITY_NUDGE,
  EASY,
  FSRS_WEIGHTS,
  GOOD,
  HARD,
  HARD_LAPSE_BLEND,
  RECALL_CURVE_DECAY,
  RECALL_CURVE_FACTOR,
} from "./constants";
import { daysBetween } from "./decay";
import type { ReviewGrade } from "./types";

const w = FSRS_WEIGHTS;

function clampDifficulty(d: number): number {
  return Math.min(10, Math.max(1, d));
}

/** S0(G) — initial stability, first-ever grade on a term. */
export function initialStability(grade: ReviewGrade): number {
  return w[grade - 1]!;
}

/** D0(G) — initial difficulty, first-ever grade on a term. */
export function initialDifficulty(grade: ReviewGrade): number {
  return clampDifficulty(w[4]! - Math.exp(w[5]! * (grade - 1)) + 1);
}

/** Difficulty update on a subsequent review — mean-reverts toward D0(Easy). */
export function updateDifficulty(difficulty: number, grade: ReviewGrade): number {
  const deltaD = -w[6]! * (grade - 3);
  const updated = difficulty + (deltaD * (10 - difficulty)) / 9;
  const meanReverted = w[7]! * initialDifficulty(EASY) + (1 - w[7]!) * updated;
  return clampDifficulty(meanReverted);
}

/** Stability update on a Good or Easy review. */
export function updateStabilityOnSuccess(
  difficulty: number,
  stability: number,
  retrievability: number,
  grade: typeof GOOD | typeof EASY,
): number {
  const factor =
    Math.exp(w[8]!) *
    (11 - difficulty) *
    stability ** -w[9]! *
    (Math.exp(w[10]! * (1 - retrievability)) - 1) *
    (grade === EASY ? w[16]! : 1);

  return stability * (1 + factor);
}

/** Stability update on lapse (grade 1, Again). As in FSRS-5, a lapse never
 *  leaves more stability than a same-day Good would take away. */
export function updateStabilityOnLapse(
  difficulty: number,
  stability: number,
  retrievability: number,
): number {
  const longTerm =
    w[11]! *
    difficulty ** -w[12]! *
    ((stability + 1) ** w[13]! - 1) *
    Math.exp(w[14]! * (1 - retrievability));
  return Math.min(longTerm, stability / Math.exp(w[17]! * w[18]!));
}

/** Stability update on Hard: between the Again and Good outcomes. */
export function updateStabilityOnHard(
  difficulty: number,
  stability: number,
  retrievability: number,
): number {
  const again = updateStabilityOnLapse(difficulty, stability, retrievability);
  const good = updateStabilityOnSuccess(difficulty, stability, retrievability, GOOD);
  return again ** HARD_LAPSE_BLEND * good ** (1 - HARD_LAPSE_BLEND);
}

/** Same-day re-review — stability-only special case. */
export function sameDayStability(stability: number, grade: ReviewGrade): number {
  return stability * Math.exp(w[17]! * (grade - 3 + w[18]!));
}

/** §3's cold-start handoff: Familiarity nudges the first Review's S0/D0. */
export function applyColdStartNudge(
  d0: number,
  s0: number,
  familiarity: number,
): { stability: number; difficulty: number } {
  return {
    difficulty: clampDifficulty(d0 - COLD_START_DIFFICULTY_NUDGE * familiarity),
    stability: s0 * (1 + COLD_START_STABILITY_NUDGE * familiarity),
  };
}

/** R_r(t) = (1 + factor·t/S_r)^decay — FSRS-5's forgetting curve. */
export function retrievability(stability: number, elapsedDays: number): number {
  return (1 + (RECALL_CURVE_FACTOR * elapsedDays) / stability) ** RECALL_CURVE_DECAY;
}

/** Days after a review until R_r falls to `target` — the inverse of retrievability. */
export function daysUntilRetrievability(stability: number, target: number): number {
  return (stability / RECALL_CURVE_FACTOR) * (target ** (1 / RECALL_CURVE_DECAY) - 1);
}

/** Orchestrates one Review grade against the current recall state — null
 *  when this is the term's first-ever Review (nullable state, §4b), in
 *  which case familiarity feeds the cold-start nudge instead of a prior S/D.
 *  Stability is computed from the difficulty before this grade, as FSRS-5
 *  does, and a review less than a day after the last one takes the
 *  short-term branch. */
export function applyReviewGrade(
  current: { stability: number; difficulty: number } | null,
  grade: ReviewGrade,
  familiarity: number,
  now: Date,
  lastReviewAt: Date | null,
): { stability: number; difficulty: number } {
  if (current === null) {
    const d0 = initialDifficulty(grade);
    const s0 = initialStability(grade);
    return applyColdStartNudge(d0, s0, familiarity);
  }

  const elapsedDays = lastReviewAt ? daysBetween(lastReviewAt, now) : 0;
  const difficulty = updateDifficulty(current.difficulty, grade);

  if (lastReviewAt && elapsedDays < 1) {
    return { stability: sameDayStability(current.stability, grade), difficulty };
  }

  const r = retrievability(current.stability, elapsedDays);
  const d = current.difficulty;
  const stability =
    grade === AGAIN
      ? updateStabilityOnLapse(d, current.stability, r)
      : grade === HARD
        ? updateStabilityOnHard(d, current.stability, r)
        : updateStabilityOnSuccess(d, current.stability, r, grade);

  return { stability, difficulty };
}
