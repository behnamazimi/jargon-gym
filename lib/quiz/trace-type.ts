import type { QuestionType } from "@/lib/trace";
import type { QuizQuestion } from "./types";

/** How TRACE weighs the answer: by how the question is answered, not what it
 *  asks. Dictation is the exception: typing a word you hear is weaker evidence. */
export function traceQuestionType(question: QuizQuestion): QuestionType {
  if (question.template === "dictation") return "dictation";
  switch (question.interaction) {
    case "choice":
      return "multiple_choice";
    case "boolean":
      return "true_false";
    case "text":
      return "typed";
  }
}
