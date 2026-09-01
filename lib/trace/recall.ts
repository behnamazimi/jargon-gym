/** §4 Recall trace (S_r, D_r) — from Review. Full FSRS-5, unmodified, using
 *  recall-before-reveal grades. S_r/D_r are null until the first Review —
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
  RETRIEVABILITY_DECAY_SCALE,
} from "./constants";
import { daysBetween } from "./decay";
import { isSameLocalDay, STUDY_TIMEZONE } from "./local-day";
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

function successBonus(grade: ReviewGrade): number {
  if (grade === HARD) return w[15]!;
  if (grade === GOOD) return 1;
  return w[16]!; // EASY
}

/** Stability update on success (grade 2/3/4). */
export function updateStabilityOnSuccess(
  difficulty: number,
  stability: number,
  retrievability: number,
  grade: ReviewGrade,
): number {
  const factor =
    Math.exp(w[8]!) *
    (11 - difficulty) *
    stability ** -w[9]! *
    (Math.exp(w[10]! * (1 - retrievability)) - 1) *
    successBonus(grade);

  return stability * (1 + factor);
}

/** Stability update on lapse (grade 1, Again). */
export function updateStabilityOnLapse(
  difficulty: number,
  stability: number,
  retrievability: number,
): number {
  return (
    w[11]! *
    difficulty ** -w[12]! *
    ((stability + 1) ** w[13]! - 1) *
    Math.exp(w[14]! * (1 - retrievability))
  );
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

/** R_r(t) = (1 + t / (9·S_r))⁻¹. */
export function retrievability(stability: number, elapsedDays: number): number {
  return 1 / (1 + elapsedDays / (RETRIEVABILITY_DECAY_SCALE * stability));
}

/** Orchestrates one Review grade against the current recall state — null
 *  when this is the term's first-ever Review (nullable state, §4b), in
 *  which case familiarity feeds the cold-start nudge instead of a prior S/D. */
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
  const r = retrievability(current.stability, elapsedDays);
  const nextDifficulty = updateDifficulty(current.difficulty, grade);

  if (lastReviewAt && isSameLocalDay(lastReviewAt, now, STUDY_TIMEZONE)) {
    return { stability: sameDayStability(current.stability, grade), difficulty: nextDifficulty };
  }

  const nextStability =
    grade === AGAIN
      ? updateStabilityOnLapse(nextDifficulty, current.stability, r)
      : updateStabilityOnSuccess(nextDifficulty, current.stability, r, grade);

  return { stability: nextStability, difficulty: nextDifficulty };
}
