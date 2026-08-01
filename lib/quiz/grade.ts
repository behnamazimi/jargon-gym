import type { QuizMcqQuestion, QuizTrueFalseQuestion } from "./types";

export function gradeMcqAnswer(question: QuizMcqQuestion, selectedOptionIds: string[]): boolean {
  const selected = new Set(selectedOptionIds);
  const correct = new Set(question.correctOptionIds);

  if (selected.size !== correct.size) return false;

  for (const id of correct) {
    if (!selected.has(id)) return false;
  }

  return true;
}

export function gradeTrueFalseAnswer(question: QuizTrueFalseQuestion, answer: boolean): boolean {
  return answer === question.correctAnswer;
}
