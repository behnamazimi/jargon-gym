import type { QuizChoiceResult } from "@/components/jargon/quiz/quiz-controls";
import type { QuizQuestion } from "@/lib/quiz/types";

export function getMcqResult(
  optionId: string,
  selectedOptionIds: string[],
  correctOptionIds: string[],
  submitted: boolean,
): QuizChoiceResult {
  if (!submitted) return "default";
  if (correctOptionIds.includes(optionId)) return "correct";
  if (selectedOptionIds.includes(optionId)) return "incorrect";
  return "default";
}

export function getTrueFalseResult(
  value: boolean,
  trueFalseAnswer: boolean | null,
  correctAnswer: boolean,
  submitted: boolean,
): QuizChoiceResult {
  if (!submitted) return "default";
  if (correctAnswer === value) return "correct";
  if (trueFalseAnswer === value) return "incorrect";
  return "default";
}

// The check→next flow moves through exactly three phases: picking an answer,
// locked while feedback shows, then ready to advance. Modeling it as a
// reducer makes combinations like "locked but advance is enabled" impossible.
type QuizAnswerPhase = "answering" | "locked" | "ready";

export type QuizAnswerState = {
  phase: QuizAnswerPhase;
  selectedOptionIds: string[];
  trueFalseAnswer: boolean | null;
  passed: boolean;
};

export type QuizAnswerAction =
  | { type: "SELECT_MCQ_OPTION"; optionId: string }
  | { type: "SELECT_TRUE_FALSE"; value: boolean }
  | { type: "SUBMIT"; passed: boolean }
  | { type: "UNLOCK" };

export const initialAnswerState: QuizAnswerState = {
  phase: "answering",
  selectedOptionIds: [],
  trueFalseAnswer: null,
  passed: false,
};

export function quizAnswerReducer(
  state: QuizAnswerState,
  action: QuizAnswerAction,
): QuizAnswerState {
  switch (action.type) {
    case "SELECT_MCQ_OPTION":
      if (state.phase !== "answering") return state;
      return { ...state, selectedOptionIds: [action.optionId] };
    case "SELECT_TRUE_FALSE":
      if (state.phase !== "answering") return state;
      return { ...state, trueFalseAnswer: action.value };
    case "SUBMIT":
      if (state.phase !== "answering") return state;
      return { ...state, phase: "locked", passed: action.passed };
    case "UNLOCK":
      if (state.phase !== "locked") return state;
      return { ...state, phase: "ready" };
  }
}

// Example-judgment true/false questions pack a quoted scenario onto a second
// line so it can be styled apart from the question itself. Every other
// question's prompt is a single line and falls through unchanged.
export function splitPromptQuote(prompt: string): { question: string; quote: string | null } {
  const newlineIndex = prompt.indexOf("\n");
  if (newlineIndex === -1) return { question: prompt, quote: null };

  return {
    question: prompt.slice(0, newlineIndex).trim(),
    quote: prompt.slice(newlineIndex + 1).trim(),
  };
}

export function canSubmitAnswer(question: QuizQuestion, state: QuizAnswerState): boolean {
  return question.type === "multiple_choice"
    ? state.selectedOptionIds.length > 0
    : state.trueFalseAnswer !== null;
}
