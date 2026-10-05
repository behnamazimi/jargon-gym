import type { QuizChoiceResult } from "@/components/quiz/quiz-controls";
import type { QuizResponse } from "@/lib/quiz/types";

/** How one answer option shows once the answer is submitted. */
export function answerResult(
  isCorrect: boolean,
  isSelected: boolean,
  submitted: boolean,
): QuizChoiceResult {
  if (!submitted) return "default";
  if (isCorrect) return "correct";
  if (isSelected) return "incorrect";
  return "default";
}

// The check→next flow moves through exactly three phases: picking an answer,
// locked while feedback shows, then ready to advance. Modeling it as a
// reducer makes combinations like "locked but advance is enabled" impossible.
type QuizAnswerPhase = "answering" | "locked" | "ready";

export type QuizAnswerState = {
  phase: QuizAnswerPhase;
  response: QuizResponse | null;
  passed: boolean;
};

export type QuizAnswerAction =
  | { type: "RESPOND"; response: QuizResponse }
  | { type: "SUBMIT"; passed: boolean }
  | { type: "UNLOCK" };

export const initialAnswerState: QuizAnswerState = {
  phase: "answering",
  response: null,
  passed: false,
};

export function quizAnswerReducer(
  state: QuizAnswerState,
  action: QuizAnswerAction,
): QuizAnswerState {
  switch (action.type) {
    case "RESPOND":
      if (state.phase !== "answering") return state;
      return { ...state, response: action.response };
    case "SUBMIT":
      if (state.phase !== "answering") return state;
      return { ...state, phase: "locked", passed: action.passed };
    case "UNLOCK":
      if (state.phase !== "locked") return state;
      return { ...state, phase: "ready" };
  }
}

export function canSubmitAnswer(state: QuizAnswerState): boolean {
  return state.response !== null;
}
