import { RadioGroup } from "react-aria-components";
import { QuizChoice } from "@/components/quiz/quiz-controls";
import { answerResult } from "@/components/quiz/quiz-question-state";
import type { QuizChoiceQuestion, QuizResponse } from "@/lib/quiz/types";

type ChoiceAnswerProps = {
  question: QuizChoiceQuestion;
  response: QuizResponse | null;
  submitted: boolean;
  onRespond: (response: QuizResponse) => void;
};

export function ChoiceAnswer({ question, response, submitted, onRespond }: ChoiceAnswerProps) {
  const selectedIds = response?.interaction === "choice" ? response.optionIds : [];

  return (
    <RadioGroup
      aria-label="Answer choices"
      value={selectedIds[0] ?? ""}
      onChange={(optionId) => onRespond({ interaction: "choice", optionIds: [optionId] })}
      isDisabled={submitted}
      className="flex flex-col gap-2 pt-5"
    >
      {question.options.map((option, index) => (
        <QuizChoice
          key={option.id}
          value={option.id}
          label={option.text}
          shortcut={index + 1}
          result={answerResult(
            question.correctOptionIds.includes(option.id),
            selectedIds.includes(option.id),
            submitted,
          )}
        />
      ))}
    </RadioGroup>
  );
}
