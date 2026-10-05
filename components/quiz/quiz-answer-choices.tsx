import { BooleanAnswer } from "@/components/quiz/boolean-answer";
import { ChoiceAnswer } from "@/components/quiz/choice-answer";
import { TextAnswer } from "@/components/quiz/text-answer";
import type { QuizQuestion, QuizResponse } from "@/lib/quiz/types";

type QuizAnswerChoicesProps = {
  question: QuizQuestion;
  response: QuizResponse | null;
  submitted: boolean;
  onRespond: (response: QuizResponse) => void;
};

/** The one place that picks an answer UI for a question's interaction. */
export function QuizAnswerChoices({ question, ...props }: QuizAnswerChoicesProps) {
  switch (question.interaction) {
    case "choice":
      return <ChoiceAnswer question={question} {...props} />;
    case "boolean":
      return <BooleanAnswer question={question} {...props} />;
    case "text":
      return <TextAnswer question={question} {...props} />;
  }
}
