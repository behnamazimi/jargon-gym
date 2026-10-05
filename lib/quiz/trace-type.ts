import type { QuestionType } from "@/lib/trace";
import type { QuizQuestion } from "./types";

/** How TRACE weighs the answer: by how the question is answered, not what it asks. */
export function traceQuestionType(question: QuizQuestion): QuestionType {
  switch (question.interaction) {
    case "choice":
      return "multiple_choice";
    case "boolean":
      return "true_false";
    case "text":
      return "typed";
  }
}
