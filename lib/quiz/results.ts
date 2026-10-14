import type { QuizAnswer, QuizQuestion } from "./types";

/** Answers are recorded one per question, in order, so answers[i] belongs
 *  to questions[i]. Unanswered and skipped questions aren't counted as missed. */
export function missedQuestions(questions: QuizQuestion[], answers: QuizAnswer[]): QuizQuestion[] {
  return questions.filter((_, index) => {
    const answer = answers[index];
    return answer?.passed === false && !answer.skipped;
  });
}

/** How many of the quiz's questions count toward its score. */
export function scoredTotal(totalQuestions: number, answers: QuizAnswer[]): number {
  return totalQuestions - answers.filter((answer) => answer.skipped).length;
}

/** Each missed term once, in the order it was first missed. */
export function missedTermIds(questions: QuizQuestion[], answers: QuizAnswer[]): string[] {
  return [...new Set(missedQuestions(questions, answers).map((question) => question.termId))];
}
