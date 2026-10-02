import { ILLUSTRATION_QUESTION_LINE, NONE_OF_THESE_OPTION_ID } from "./illustration";
import type { QuizQuestion } from "./types";

/** One sentence that says why the answer was right or wrong, built only from
 *  what the question already carries. Null when there is nothing reliable to add. */
export function quizFeedbackLine(question: QuizQuestion, passed: boolean): string | null {
  if (question.type !== "multiple_choice") return null;

  const correct = question.options.find((option) => question.correctOptionIds.includes(option.id));
  const isIllustration = question.prompt.startsWith(ILLUSTRATION_QUESTION_LINE);

  if (isIllustration && question.correctOptionIds.includes(NONE_OF_THESE_OPTION_ID)) {
    const term = question.options.find((option) => option.id === question.termId);
    return term
      ? `This is an anti-example of ${term.text}: it shows what the term is not.`
      : "This is an anti-example: it shows what a term is not.";
  }

  if (passed || !correct) return null;

  return isIllustration ? `This shows ${correct.text}.` : `That definition is for ${correct.text}.`;
}
