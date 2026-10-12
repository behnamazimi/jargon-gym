import { LEARNING_STEP_MAX_RETRIES, applyReviewGrade, type ReviewGrade } from "@/lib/trace";
import type { ReviewRecallState } from "@/lib/terms/term-card";
import type { ReviewTerm } from "./types";

/** A missed term is asked again after about this many other cards. */
export const RETRY_AFTER_CARDS = 5;

/** The same term can be on screen more than once in a session, so state that
 *  belongs to one showing is keyed by this, not by the term id. */
export function cardKey(term: Pick<ReviewTerm, "id" | "visit">): string {
  return `${term.id}:${term.visit ?? 0}`;
}

/** An Again on a card that still has retries left brings the term back. */
export function shouldRetry(term: Pick<ReviewTerm, "visit">, grade: ReviewGrade): boolean {
  return grade === 1 && (term.visit ?? 0) < LEARNING_STEP_MAX_RETRIES;
}

/** The recall state right after `grade`, worked out here so the retry card's
 *  buttons are right before the server has saved anything. */
function nextRecallState(
  recall: ReviewRecallState | undefined,
  grade: ReviewGrade,
  now: Date,
): ReviewRecallState {
  const current = recall ?? {
    stability: null,
    difficulty: null,
    lastReviewAt: null,
    readCount: 0,
    lastReadAt: null,
  };
  const next = applyReviewGrade(
    {
      readCount: current.readCount,
      lastReadAt: current.lastReadAt ? new Date(current.lastReadAt) : null,
      recallStability: current.stability,
      recallDifficulty: current.difficulty,
      lastReviewRecallAt: current.lastReviewAt ? new Date(current.lastReviewAt) : null,
    },
    grade,
    now,
  );
  return {
    ...current,
    stability: next.recallStability,
    difficulty: next.recallDifficulty,
    lastReviewAt: now.toISOString(),
  };
}

/** The card that asks the same term again. */
export function makeRetryCard(term: ReviewTerm, grade: ReviewGrade, now: Date): ReviewTerm {
  return {
    ...term,
    visit: (term.visit ?? 0) + 1,
    isNewToUser: false,
    recall: nextRecallState(term.recall, grade, now),
  };
}

/** Puts `retry` after RETRY_AFTER_CARDS other cards, or at the end if fewer are left. */
export function insertRetry(
  terms: ReviewTerm[],
  currentIndex: number,
  retry: ReviewTerm,
): ReviewTerm[] {
  const at = Math.min(currentIndex + 1 + RETRY_AFTER_CARDS, terms.length);
  return [...terms.slice(0, at), retry, ...terms.slice(at)];
}
