import type { QuizQuestion, QuizResponse } from "./types";

/** A response of the wrong interaction never passes. */
export function gradeAnswer(question: QuizQuestion, response: QuizResponse): boolean {
  if (question.interaction === "choice" && response.interaction === "choice") {
    const selected = new Set(response.optionIds);
    const correct = new Set(question.correctOptionIds);
    return selected.size === correct.size && [...correct].every((id) => selected.has(id));
  }
  if (question.interaction === "boolean" && response.interaction === "boolean") {
    return response.value === question.correctAnswer;
  }
  return false;
}
