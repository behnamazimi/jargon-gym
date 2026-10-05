import type { QuizQuestion, QuizResponse } from "./types";

/** Digit keys pick an answer in the order the choices are shown (the first
 *  boolean label is 1, the second is 2). Modified or held keys and keys typed
 *  into a text field are left alone. */
export function quizResponseForKey(
  input: {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    repeat?: boolean;
    typing: boolean;
  },
  question: QuizQuestion,
): QuizResponse | null {
  if (input.metaKey || input.ctrlKey || input.altKey || input.repeat || input.typing) return null;
  if (!/^[1-9]$/.test(input.key)) return null;

  const index = Number(input.key) - 1;
  if (question.interaction === "text") return null;
  if (question.interaction === "choice") {
    const option = question.options[index];
    return option ? { interaction: "choice", optionIds: [option.id] } : null;
  }
  return index <= 1 ? { interaction: "boolean", value: index === 0 } : null;
}
