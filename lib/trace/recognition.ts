/** §5 Recognition trace (S_g, D_g) — from Quiz. Quiz answers are noisy
 *  (guessing), so each answer updates a posterior probability of knowledge
 *  rather than a discrete grade. S_g/posterior are null until the first
 *  Quiz answer — see §4b's nullable-state rule, echoed here. */

import {
  P_CORRECT_GIVEN_GUESS_MCQ,
  P_CORRECT_GIVEN_GUESS_TF,
  P_CORRECT_GIVEN_GUESS_TYPED,
  P_CORRECT_GIVEN_KNOWS,
  QUIZ_FAIL_PENALTY_RECALL_WEIGHT,
  RECOGNITION_INITIAL_PRIOR,
  RECOGNITION_STABILITY_SCALE,
  RECOGNITION_DECAY_SCALE,
} from "./constants";
import type { QuestionType } from "./types";

const GUESS_RATE: Record<QuestionType, number> = {
  multiple_choice: P_CORRECT_GIVEN_GUESS_MCQ,
  true_false: P_CORRECT_GIVEN_GUESS_TF,
  typed: P_CORRECT_GIVEN_GUESS_TYPED,
};

/** Bayesian posterior update for one answer. `prior` is null only for the
 *  very first answer — RECOGNITION_INITIAL_PRIOR (0.5) is used at that
 *  moment only, never stored as a standing default (§5).
 *
 *  On an incorrect answer, the Bayesian-updated posterior is softened by
 *  the cross-track sanity check: penalty_scale = 1 − 0.5·R_r(t). High
 *  current recall retrievability makes a quiz miss more likely a misclick
 *  than real forgetting, so the posterior moves less far toward the
 *  failure-implied value. `recallRetrievability` is null when the term has
 *  no Review history yet — nothing to soften against, so the full penalty applies. */
export function updatePosterior(
  prior: number | null,
  correct: boolean,
  questionType: QuestionType,
  recallRetrievability: number | null,
): number {
  const p = prior ?? RECOGNITION_INITIAL_PRIOR;
  const pGuess = GUESS_RATE[questionType];

  if (correct) {
    return (P_CORRECT_GIVEN_KNOWS * p) / (P_CORRECT_GIVEN_KNOWS * p + pGuess * (1 - p));
  }

  const pIncorrectGivenKnows = 1 - P_CORRECT_GIVEN_KNOWS;
  const pIncorrectGivenGuess = 1 - pGuess;
  const bayesPosterior =
    (pIncorrectGivenKnows * p) / (pIncorrectGivenKnows * p + pIncorrectGivenGuess * (1 - p));

  const penaltyScale =
    recallRetrievability !== null ? 1 - QUIZ_FAIL_PENALTY_RECALL_WEIGHT * recallRetrievability : 1;

  return p + penaltyScale * (bayesPosterior - p);
}

/** S_g = 1 + k_g · p. */
export function posteriorToStability(posterior: number): number {
  return 1 + RECOGNITION_STABILITY_SCALE * posterior;
}

/** R_g(t) = (1 + t / (9·S_g))⁻¹. */
export function retrievability(stability: number, elapsedDays: number): number {
  return 1 / (1 + elapsedDays / (RECOGNITION_DECAY_SCALE * stability));
}

/** Days after an answer until R_g falls to `target` — the inverse of retrievability. */
export function daysUntilRetrievability(stability: number, target: number): number {
  return RECOGNITION_DECAY_SCALE * stability * (1 / target - 1);
}
