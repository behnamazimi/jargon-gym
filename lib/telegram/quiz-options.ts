import { gradeAnswer } from "@/lib/quiz/grade";
import { booleanLabelsFor } from "@/lib/quiz/templates/registry";
import type { QuizQuestion, QuizResponse } from "@/lib/quiz/types";

/** One tappable answer. Its `id` is what the button's callback carries. */
export type QuizTelegramOption = {
  id: string;
  label: string;
  response: QuizResponse;
};

export function quizOptions(question: QuizQuestion): QuizTelegramOption[] {
  if (question.interaction === "choice") {
    return question.options.map((option) => ({
      id: option.id,
      label: option.text,
      response: { interaction: "choice", optionIds: [option.id] },
    }));
  }

  const labels = booleanLabelsFor(question);
  return [
    { id: "yes", label: labels.yes, response: { interaction: "boolean", value: true } },
    { id: "no", label: labels.no, response: { interaction: "boolean", value: false } },
  ];
}

export function correctOption(question: QuizQuestion): QuizTelegramOption | undefined {
  return quizOptions(question).find((option) => gradeAnswer(question, option.response));
}
