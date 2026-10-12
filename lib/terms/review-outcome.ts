/**
 * Shared review/quiz outcome rules for web + Telegram.
 * Sole writer of review_state events — surfaces must not call the event RPCs directly.
 * @see docs/trace-formula.md
 *
 * Three writes, one per event shape:
 * - recordRead — Read page/command, library card open. Pure exposure.
 * - recordReveal — Review flashcard reveal. No TRACE state changes, no test yet.
 * - recordTest — Review grade or quiz answer. The only writer of pass/fail
 *   history, scoped to whichever `activity` it's called with.
 *
 * No pool flips here — known/unknown is a read-only label derived live from
 * Mastery_adjusted (lib/trace.deriveKnownLabel), not a stored toggle.
 *
 * Review/Quiz fetch the term's current TRACE state themselves before
 * computing the next one: the FSRS-5/Bayesian math runs in TS, so (unlike
 * the old streak counters, which SQL could bump in place) the prior
 * S_r/D_r/posterior has to be read into TS first.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { readBrowserTimezone } from "@/lib/streak/browser-timezone";
import type { Database } from "@/lib/supabase/database.types";
import {
  AGAIN,
  GOOD,
  LEARNING_STEP_WINDOW_MINUTES,
  applyQuizAnswer as computeQuizAnswer,
  applyReviewGrade as computeReviewGrade,
  computeTraceSnapshot,
  crossedThresholds,
} from "@/lib/trace";
import type { QuestionType, ReviewGrade, TraceState } from "@/lib/trace";
import type { ReviewEvent } from "@/lib/trace-queue";
import {
  bumpStreak,
  bumpStreakForUser,
  fetchTraceState,
  fetchTraceStateForUser,
  recordTraceEvent,
  recordTraceEventForUser,
} from "@/lib/trace-queue/repository";

type Client = SupabaseClient<Database>;

export type AuthMode = "session" | "admin";

async function writeEvent(
  client: Client,
  mode: AuthMode,
  userId: string,
  termId: string,
  event: ReviewEvent,
  payload?: {
    recallStability?: number;
    recallDifficulty?: number;
    quizKnowledgePosterior?: number;
    crossedKnownThreshold?: boolean;
    crossedLearningThreshold?: boolean;
    grade?: number;
    questionType?: QuestionType;
    retrievabilityBefore?: number;
    isRetry?: boolean;
  },
) {
  if (mode === "session") {
    await Promise.all([
      recordTraceEvent(client, termId, event, payload),
      readBrowserTimezone().then((timezone) => bumpStreak(client, timezone)),
    ]);
  } else {
    await Promise.all([
      recordTraceEventForUser(client, userId, termId, event, payload),
      bumpStreakForUser(client, userId),
    ]);
  }
}

async function loadState(client: Client, mode: AuthMode, userId: string, termId: string) {
  return mode === "session"
    ? fetchTraceState(client, termId)
    : fetchTraceStateForUser(client, userId, termId);
}

/** Read page/command, `/read`, or opening a term card on the library page: deliberate but untested
 *  exposure. All three Read surfaces (web, widget, Telegram) gate the definition behind an
 *  explicit reveal — call this at reveal time, never at delivery/fetch time. */
export async function recordRead(
  client: Client,
  userId: string,
  termId: string,
  mode: AuthMode = "session",
): Promise<void> {
  await writeEvent(client, mode, userId, termId, "read");
}

/** Review flashcard reveal: recorded for parity with Read's reveal gate, but
 *  (unlike Read) doesn't change any TRACE state — the grade that follows is
 *  what actually updates recall_stability/recall_difficulty. */
export async function recordReveal(
  client: Client,
  userId: string,
  termId: string,
  mode: AuthMode = "session",
): Promise<void> {
  await writeEvent(client, mode, userId, termId, "reveal");
}

export type ReviewGradeResult = {
  passed: boolean;
  recallStability: number;
  recallDifficulty: number;
};

/** A retry is a missed term re-asked in the same session. It only counts as one
 *  when the term was graded a moment ago, so a stray flag can't skip a real test. */
function isLearningStepRetry(state: TraceState, now: Date, requested: boolean): boolean {
  if (!requested || state.lastReviewRecallAt === null) return false;
  return (
    now.getTime() - state.lastReviewRecallAt.getTime() <= LEARNING_STEP_WINDOW_MINUTES * 60_000
  );
}

/** Review grade: fetches current state, applies full FSRS-5 via lib/trace,
 *  persists the result. `grade >= HARD` counts as a pass for the event log.
 *  A retry (`retry: true`) updates recall stability and difficulty but isn't a
 *  new test: it adds no test count and stamps no high-water mark. */
export async function applyReviewGrade(
  client: Client,
  userId: string,
  input: {
    termId: string;
    grade: ReviewGrade;
    mode?: AuthMode;
    retry?: boolean;
  },
): Promise<ReviewGradeResult> {
  const mode = input.mode ?? "session";
  const now = new Date();

  const state = await loadState(client, mode, userId, input.termId);
  const retry = isLearningStepRetry(state, now, input.retry === true);
  const preSnapshot = computeTraceSnapshot(state, now);
  const next = computeReviewGrade(state, input.grade, now);

  const postState: TraceState = {
    ...state,
    recallStability: next.recallStability,
    recallDifficulty: next.recallDifficulty,
    reviewRecallCount: state.reviewRecallCount + (retry ? 0 : 1),
    lastReviewRecallAt: now,
  };
  const snapshot = computeTraceSnapshot(postState, now);
  const crossed = retry
    ? { known: false, learning: false }
    : crossedThresholds(snapshot.knownLabel, input.grade !== AGAIN);
  const event: ReviewEvent = input.grade >= GOOD ? "review_pass" : "review_fail";

  await writeEvent(client, mode, userId, input.termId, event, {
    recallStability: next.recallStability,
    recallDifficulty: next.recallDifficulty,
    crossedKnownThreshold: crossed.known,
    crossedLearningThreshold: crossed.learning,
    grade: input.grade,
    retrievabilityBefore: preSnapshot.recallRetrievability ?? undefined,
    isRetry: retry,
  });

  return { passed: input.grade >= GOOD, ...next };
}

export type QuizAnswerResult = {
  passed: boolean;
  quizKnowledgePosterior: number;
};

/** Quiz answer: fetches current state, applies the Bayesian posterior
 *  update via lib/trace (softened on failure by current recall strength),
 *  persists the result. */
export async function applyQuizAnswer(
  client: Client,
  userId: string,
  input: {
    termId: string;
    passed: boolean;
    questionType: QuestionType;
    mode?: AuthMode;
  },
): Promise<QuizAnswerResult> {
  const mode = input.mode ?? "session";
  const now = new Date();

  const state = await loadState(client, mode, userId, input.termId);
  const preSnapshot = computeTraceSnapshot(state, now);
  const next = computeQuizAnswer(state, input.passed, input.questionType, now);

  const postState: TraceState = {
    ...state,
    quizKnowledgePosterior: next.quizKnowledgePosterior,
    quizTestCount: state.quizTestCount + 1,
    lastQuizTestedAt: now,
  };
  const snapshot = computeTraceSnapshot(postState, now);
  const crossed = crossedThresholds(snapshot.knownLabel, input.passed);
  const event: ReviewEvent = input.passed ? "quiz_pass" : "quiz_fail";

  await writeEvent(client, mode, userId, input.termId, event, {
    quizKnowledgePosterior: next.quizKnowledgePosterior,
    crossedKnownThreshold: crossed.known,
    crossedLearningThreshold: crossed.learning,
    questionType: input.questionType,
    retrievabilityBefore: preSnapshot.recognitionRetrievability ?? undefined,
  });

  return {
    passed: input.passed,
    quizKnowledgePosterior: next.quizKnowledgePosterior,
  };
}
