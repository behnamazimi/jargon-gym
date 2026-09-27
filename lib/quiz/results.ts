import type { QuizAnswer, QuizQuestion } from "./types";

/** Answers are recorded one per question, in order, so answers[i] belongs
 *  to questions[i]. Unanswered questions (a quiz left early) aren't
 *  counted as missed. */
export function missedQuestions(questions: QuizQuestion[], answers: QuizAnswer[]): QuizQuestion[] {
  return questions.filter((_, index) => answers[index]?.passed === false);
}

/** Each missed term once, in the order it was first missed. */
export function missedTermIds(questions: QuizQuestion[], answers: QuizAnswer[]): string[] {
  return [...new Set(missedQuestions(questions, answers).map((question) => question.termId))];
}
