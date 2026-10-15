/** Compose-across-layers functions: a full-state snapshot, or a single
 *  event applied to full state. Split out of index.ts purely to keep files
 *  short — index.ts re-exports everything here, so it remains the only
 *  door into lib/trace from outside this folder.
 *  @see docs/trace-formula.md
 */

import {
  AGAIN,
  EASY,
  GOOD,
  HARD,
  MASTERY_HORIZON_DAYS,
  RECOGNITION_INITIAL_PRIOR,
  UNTESTED_RECALL_RETRIEVABILITY,
} from "./constants";
import { daysBetween } from "./decay";
import { familiarityUsed, computeFamiliarity } from "./familiarity";
import {
  aggregateMastery as aggregatePerTermMastery,
  blendMastery,
  masteryAdjusted,
  deriveKnownLabel,
} from "./mastery";
import {
  applyReviewGrade as applyRecallGrade,
  daysUntilRetrievability,
  retrievability as recallRetrievability,
} from "./recall";
import {
  posteriorToStability,
  retrievability as recognitionRetrievability,
  updatePosterior,
} from "./recognition";
import type { QuestionType, ReviewGrade, TraceCandidate, TraceSnapshot, TraceState } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Recall retrievability MASTERY_HORIZON_DAYS from now, or null with no
 *  Review history. Mastery reads it there so a grade, even a miss, doesn't
 *  count as a fresh memory. */
function recallAhead(
  state: Pick<TraceState, "recallStability" | "lastReviewRecallAt">,
  now: Date,
): number | null {
  if (state.recallStability === null) return null;
  const ahead = new Date(now.getTime() + MASTERY_HORIZON_DAYS * DAY_MS);
  return recallRetrievability(
    state.recallStability,
    daysBetween(state.lastReviewRecallAt ?? now, ahead),
  );
}

/** The chance the term is known from Quiz (the posterior) times how much of
 *  it is left MASTERY_HORIZON_DAYS from now, or null with no Quiz history. */
function recognitionAhead(
  state: Pick<TraceState, "quizKnowledgePosterior" | "lastQuizTestedAt">,
  now: Date,
): number | null {
  if (state.quizKnowledgePosterior === null) return null;
  const ahead = new Date(now.getTime() + MASTERY_HORIZON_DAYS * DAY_MS);
  const kept = recognitionRetrievability(
    posteriorToStability(state.quizKnowledgePosterior),
    daysBetween(state.lastQuizTestedAt ?? now, ahead),
  );
  return state.quizKnowledgePosterior * kept;
}

/** Full live snapshot of one term's trace state — familiarity, both
 *  retrievabilities, and the blended mastery/label. */
export function computeTraceSnapshot(state: TraceState, now: Date): TraceSnapshot {
  const familiarity = computeFamiliarity(state.readCount, state.lastReadAt, now);
  const recallR =
    state.recallStability !== null
      ? recallRetrievability(
          state.recallStability,
          daysBetween(state.lastReviewRecallAt ?? now, now),
        )
      : null;
  const recognitionR =
    state.quizKnowledgePosterior !== null
      ? recognitionRetrievability(
          posteriorToStability(state.quizKnowledgePosterior),
          daysBetween(state.lastQuizTestedAt ?? now, now),
        )
      : null;

  const familiarityUsedValue = familiarityUsed(familiarity);
  const mastery = blendMastery({
    familiarityUsed: familiarityUsedValue,
    recallRetrievability: recallAhead(state, now),
    recognitionRetrievability: recognitionAhead(state, now),
  });
  const testCount = state.reviewRecallCount + state.quizTestCount;
  const adjustedMastery = masteryAdjusted(mastery, testCount);

  return {
    familiarity,
    familiarityUsed: familiarityUsedValue,
    recallRetrievability: recallR,
    recognitionRetrievability: recognitionR,
    mastery,
    masteryAdjusted: adjustedMastery,
    knownLabel: deriveKnownLabel(adjustedMastery, testCount),
  };
}

/** Read event: exposure only, no scoring math beyond the count/timestamp bump. */
export function applyReadEvent(
  state: Pick<TraceState, "readCount">,
  now: Date,
): { readCount: number; lastReadAt: Date } {
  return { readCount: state.readCount + 1, lastReadAt: now };
}

/** Review grade: familiarity (from the Read state already in hand) feeds
 *  the cold-start nudge on a term's first-ever grade; every later grade
 *  ignores familiarity and updates purely from the prior S_r/D_r. */
export function applyReviewGrade(
  state: Pick<
    TraceState,
    "readCount" | "lastReadAt" | "recallStability" | "recallDifficulty" | "lastReviewRecallAt"
  >,
  grade: ReviewGrade,
  now: Date,
): { recallStability: number; recallDifficulty: number } {
  const familiarity = computeFamiliarity(state.readCount, state.lastReadAt, now);
  const current =
    state.recallStability !== null && state.recallDifficulty !== null
      ? { stability: state.recallStability, difficulty: state.recallDifficulty }
      : null;

  const next = applyRecallGrade(current, grade, familiarity, now, state.lastReviewRecallAt);
  return { recallStability: next.stability, recallDifficulty: next.difficulty };
}

/** Days after a grade given now until the term falls back to Review's line
 *  (UNTESTED_RECALL_RETRIEVABILITY), for each grade. An estimate of when it
 *  comes back: the queue serves it then, ahead of new terms, unless other
 *  terms have faded further. */
export function daysUntilNextReview(
  state: Pick<
    TraceState,
    "readCount" | "lastReadAt" | "recallStability" | "recallDifficulty" | "lastReviewRecallAt"
  >,
  now: Date,
): Record<ReviewGrade, number> {
  const days = (grade: ReviewGrade) =>
    daysUntilRetrievability(
      applyReviewGrade(state, grade, now).recallStability,
      UNTESTED_RECALL_RETRIEVABILITY,
    );
  return { [AGAIN]: days(AGAIN), [HARD]: days(HARD), [GOOD]: days(GOOD), [EASY]: days(EASY) };
}

/** Quiz answer: posterior update, softened on failure by current recall
 *  strength (null recallStability — no Review history yet — applies the
 *  full, unsoftened penalty). A term's first answer starts from its recall
 *  a week ahead when it has been reviewed, and from 50/50 otherwise. */
export function applyQuizAnswer(
  state: Pick<TraceState, "quizKnowledgePosterior" | "recallStability" | "lastReviewRecallAt">,
  correct: boolean,
  questionType: QuestionType,
  now: Date,
): { quizKnowledgePosterior: number } {
  const recallR =
    state.recallStability !== null
      ? recallRetrievability(
          state.recallStability,
          daysBetween(state.lastReviewRecallAt ?? now, now),
        )
      : null;

  const firstPrior = recallAhead(state, now);
  const prior =
    state.quizKnowledgePosterior === null && firstPrior !== null
      ? Math.max(RECOGNITION_INITIAL_PRIOR, firstPrior)
      : state.quizKnowledgePosterior;
  const posterior = updatePosterior(prior, correct, questionType, recallR);
  return { quizKnowledgePosterior: posterior };
}

/** §8 OverallMastery across a set of candidates already scoped to N_active
 *  (≥1 Read) — computes each term's Mastery_adjusted then averages. */
export function aggregateMastery(candidates: TraceCandidate[], now: Date): number {
  const values = candidates.map((c) => computeTraceSnapshot(c, now).masteryAdjusted);
  return aggregatePerTermMastery(values);
}
