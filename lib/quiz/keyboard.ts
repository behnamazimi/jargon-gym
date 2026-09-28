import type { QuizQuestion } from "./types";

export type QuizKeyChoice =
  | { type: "multiple_choice"; optionId: string }
  | { type: "true_false"; value: boolean };

/** Digit keys pick an answer in the order the choices are shown (True is
 *  1, False is 2). Modified or held keys and keys typed into a text field
 *  are left alone. */
export function quizChoiceForKey(
  input: {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    repeat?: boolean;
    typing: boolean;
  },
  question: QuizQuestion,
): QuizKeyChoice | null {
  if (input.metaKey || input.ctrlKey || input.altKey || input.repeat || input.typing) return null;
  if (!/^[1-9]$/.test(input.key)) return null;

  const index = Number(input.key) - 1;
  if (question.type === "multiple_choice") {
    const option = question.options[index];
    return option ? { type: "multiple_choice", optionId: option.id } : null;
  }
  return index <= 1 ? { type: "true_false", value: index === 0 } : null;
}
