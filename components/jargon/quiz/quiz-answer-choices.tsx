import { RadioGroup } from "react-aria-components";
import { QuizChoice } from "@/components/jargon/quiz/quiz-controls";
import type { QuizQuestion } from "@/lib/quiz/types";
import {
  getMcqResult,
  getTrueFalseResult,
  type QuizAnswerState,
} from "@/components/jargon/quiz/quiz-question-state";

type QuizAnswerChoicesProps = {
  question: QuizQuestion;
  state: QuizAnswerState;
  submitted: boolean;
  onSelectOption: (optionId: string) => void;
  onSelectTrueFalse: (value: boolean) => void;
};

export function QuizAnswerChoices({
  question,
  state,
  submitted,
  onSelectOption,
  onSelectTrueFalse,
}: QuizAnswerChoicesProps) {
  if (question.type === "multiple_choice") {
    return (
      <RadioGroup
        aria-label="Answer choices"
        value={state.selectedOptionIds[0] ?? ""}
        onChange={onSelectOption}
        isDisabled={submitted}
        className="flex flex-col gap-2 pt-5"
      >
        {question.options.map((option) => (
          <QuizChoice
            key={option.id}
            value={option.id}
            label={option.text}
            result={getMcqResult(
              option.id,
              state.selectedOptionIds,
              question.correctOptionIds,
              submitted,
            )}
          />
        ))}
      </RadioGroup>
    );
  }

  return (
    <RadioGroup
      aria-label="Answer choices"
      value={state.trueFalseAnswer === null ? "" : String(state.trueFalseAnswer)}
      onChange={(value) => onSelectTrueFalse(value === "true")}
      isDisabled={submitted}
      className="grid gap-2 pt-5 sm:grid-cols-2"
    >
      {[true, false].map((value) => (
        <QuizChoice
          key={String(value)}
          value={String(value)}
          label={value ? "True" : "False"}
          result={getTrueFalseResult(
            value,
            state.trueFalseAnswer,
            question.correctAnswer,
            submitted,
          )}
        />
      ))}
    </RadioGroup>
  );
}
