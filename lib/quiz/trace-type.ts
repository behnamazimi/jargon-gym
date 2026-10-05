import type { QuestionType } from "@/lib/trace";
import type { QuizQuestion } from "./types";

/** How TRACE weighs the answer: by how the question is answered, not what it asks. */
export function traceQuestionType(question: QuizQuestion): QuestionType {
  return question.interaction === "choice" ? "multiple_choice" : "true_false";
}
