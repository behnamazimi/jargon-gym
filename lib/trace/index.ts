/** TRACE — public API.
 *
 *  Layers: constants → decay/local-day (shared helpers) → familiarity/
 *  recall/recognition (one trace each) → mastery/queue (compose across
 *  traces) → this barrel (compose across layers into the shapes callers
 *  actually want: a full-state snapshot, or a single event applied to
 *  full state). Nothing outside lib/trace should reach past this file.
 *  @see docs/trace-smart-queue.md
 */

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
  retrievability as recallRetrievability,
} from "./recall";
import {
  posteriorToStability,
  retrievability as recognitionRetrievability,
  updatePosterior,
} from "./recognition";
import type { QuestionType, ReviewGrade, TraceCandidate, TraceSnapshot, TraceState } from "./types";

export * from "./constants";
export type {
  KnownLabel,
  QuestionType,
  ReviewGrade,
  TraceCandidate,
  TraceSnapshot,
  TraceState,
} from "./types";
export { rankReadQueue, rankReviewQueue, rankQuizQueue } from "./queue";
export { deriveKnownLabel, confidence, blendMastery, masteryAdjusted } from "./mastery";
export { STUDY_TIMEZONE, isSameLocalDay } from "./local-day";

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
    recallRetrievability: recallR,
    recognitionRetrievability: recognitionR,
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

/** Quiz answer: posterior update, softened on failure by current recall
 *  strength (null recallStability — no Review history yet — applies the
 *  full, unsoftened penalty). */
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

  const posterior = updatePosterior(state.quizKnowledgePosterior, correct, questionType, recallR);
  return { quizKnowledgePosterior: posterior };
}

/** §8 OverallMastery across a set of candidates already scoped to N_active
 *  (≥1 Read) — computes each term's Mastery_adjusted then averages. */
export function aggregateMastery(candidates: TraceCandidate[], now: Date): number {
  const values = candidates.map((c) => computeTraceSnapshot(c, now).masteryAdjusted);
  return aggregatePerTermMastery(values);
}
