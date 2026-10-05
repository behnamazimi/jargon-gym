import { RadioGroup } from "react-aria-components";
import { QuizChoice } from "@/components/quiz/quiz-controls";
import { answerResult } from "@/components/quiz/quiz-question-state";
import { booleanLabelsFor } from "@/lib/quiz/templates/registry";
import type { QuizBooleanQuestion, QuizResponse } from "@/lib/quiz/types";

type BooleanAnswerProps = {
  question: QuizBooleanQuestion;
  response: QuizResponse | null;
  submitted: boolean;
  onRespond: (response: QuizResponse) => void;
};

export function BooleanAnswer({ question, response, submitted, onRespond }: BooleanAnswerProps) {
  const selected = response?.interaction === "boolean" ? response.value : null;
  const labels = booleanLabelsFor(question);

  return (
    <RadioGroup
      aria-label="Answer choices"
      value={selected === null ? "" : String(selected)}
      onChange={(value) => onRespond({ interaction: "boolean", value: value === "true" })}
      isDisabled={submitted}
      className="grid gap-2 pt-5 sm:grid-cols-2"
    >
      {[true, false].map((value, index) => (
        <QuizChoice
          key={String(value)}
          value={String(value)}
          label={value ? labels.yes : labels.no}
          shortcut={index + 1}
          result={answerResult(question.correctAnswer === value, selected === value, submitted)}
        />
      ))}
    </RadioGroup>
  );
}
