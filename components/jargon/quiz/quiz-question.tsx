"use client";

import { Circle, CircleDot } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  QuizActionBar,
  QuizChoice,
  QuizFeedback,
  QuizKeyboardHint,
  QuizPanel,
  QuizPanelBody,
} from "@/components/jargon/quiz/quiz-ui";
import type { QuizQuestion } from "@/lib/quiz/types";
import { gradeMcqAnswer, gradeTrueFalseAnswer } from "@/lib/quiz/types";

type QuizQuestionViewProps = {
  question: QuizQuestion;
  termLabel: string;
  isLast: boolean;
  onAnswer: (passed: boolean) => void;
};

function getMcqChoiceState(
  optionId: string,
  selectedOptionIds: string[],
  correctOptionIds: string[],
  submitted: boolean,
): "default" | "selected" | "correct" | "incorrect" {
  const isSelected = selectedOptionIds.includes(optionId);
  const isCorrect = correctOptionIds.includes(optionId);

  if (submitted && isCorrect) return "correct";
  if (submitted && isSelected && !isCorrect) return "incorrect";
  if (!submitted && isSelected) return "selected";
  return "default";
}

function getTrueFalseChoiceState(
  value: boolean,
  trueFalseAnswer: boolean | null,
  correctAnswer: boolean,
  submitted: boolean,
): "default" | "selected" | "correct" | "incorrect" {
  const isSelected = trueFalseAnswer === value;
  const isCorrect = correctAnswer === value;

  if (submitted && isCorrect) return "correct";
  if (submitted && isSelected && !isCorrect) return "incorrect";
  if (!submitted && isSelected) return "selected";
  return "default";
}

export function QuizQuestionView({ question, isLast, onAnswer }: QuizQuestionViewProps) {
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [passed, setPassed] = useState(false);
  const gradedPassedRef = useRef(false);

  const canSubmit =
    question.type === "multiple_choice" ? selectedOptionIds.length > 0 : trueFalseAnswer !== null;

  const stateRef = useRef({
    submitted,
    canSubmit,
    question,
    selectedOptionIds,
    trueFalseAnswer,
    onAnswer,
  });

  stateRef.current = {
    submitted,
    canSubmit,
    question,
    selectedOptionIds,
    trueFalseAnswer,
    onAnswer,
  };

  function submitAnswer() {
    const state = stateRef.current;
    if (state.submitted || !state.canSubmit) return;

    const result =
      state.question.type === "multiple_choice"
        ? gradeMcqAnswer(state.question, state.selectedOptionIds)
        : gradeTrueFalseAnswer(state.question, state.trueFalseAnswer ?? false);

    gradedPassedRef.current = result;
    setPassed(result);
    setSubmitted(true);
  }

  function advanceAnswer() {
    stateRef.current.onAnswer(gradedPassedRef.current);
  }

  function selectOption(optionId: string) {
    if (submitted) return;
    setSelectedOptionIds([optionId]);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter") return;

      const target = event.target as HTMLElement;
      if (target.tagName === "TEXTAREA") return;

      const state = stateRef.current;

      if (!state.submitted) {
        if (!state.canSubmit) return;

        event.preventDefault();
        event.stopPropagation();

        const result =
          state.question.type === "multiple_choice"
            ? gradeMcqAnswer(state.question, state.selectedOptionIds)
            : gradeTrueFalseAnswer(state.question, state.trueFalseAnswer ?? false);

        gradedPassedRef.current = result;
        setPassed(result);
        setSubmitted(true);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      state.onAnswer(gradedPassedRef.current);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const correctOptionLabels =
    question.type === "multiple_choice"
      ? question.options
          .filter((option) => question.correctOptionIds.includes(option.id))
          .map((option) => option.text)
      : [];

  const feedbackDetail =
    !passed && question.type === "multiple_choice" && correctOptionLabels.length > 0
      ? `The answer: ${correctOptionLabels.join("; ")}`
      : !passed && question.type === "true_false"
        ? `The statement is ${question.correctAnswer ? "true" : "false"}.`
        : undefined;

  return (
    <QuizPanel>
      <QuizPanelBody className="space-y-5">
        <div className="space-y-3">
          <h2 className="m-0 text-lg font-semibold leading-snug">{question.prompt}</h2>
        </div>

        {question.type === "multiple_choice" ? (
          <div className="flex flex-col gap-2">
            {question.options.map((option) => {
              const choiceState = getMcqChoiceState(
                option.id,
                selectedOptionIds,
                question.correctOptionIds,
                submitted,
              );
              const isSelected = selectedOptionIds.includes(option.id);

              return (
                <QuizChoice
                  key={option.id}
                  label={option.text}
                  state={choiceState}
                  disabled={submitted}
                  onSelect={() => selectOption(option.id)}
                  marker={
                    isSelected ? (
                      <CircleDot className="size-4 text-primary" aria-hidden strokeWidth={1.5} />
                    ) : (
                      <Circle
                        className="size-4 text-base-content/30"
                        aria-hidden
                        strokeWidth={1.5}
                      />
                    )
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {[true, false].map((value) => (
              <QuizChoice
                key={String(value)}
                label={value ? "True" : "False"}
                state={getTrueFalseChoiceState(
                  value,
                  trueFalseAnswer,
                  question.correctAnswer,
                  submitted,
                )}
                disabled={submitted}
                onSelect={() => !submitted && setTrueFalseAnswer(value)}
              />
            ))}
          </div>
        )}

        {submitted ? (
          <QuizFeedback
            passed={passed}
            title={passed ? "Correct!" : "Not quite."}
            detail={feedbackDetail}
          />
        ) : null}

        <QuizActionBar
          hint={
            submitted ? (
              <QuizKeyboardHint action={isLast ? "see results" : "continue"} />
            ) : (
              <QuizKeyboardHint action="check" />
            )
          }
        >
          {!submitted ? (
            <Button type="button" onPress={submitAnswer} isDisabled={!canSubmit}>
              Check answer
            </Button>
          ) : (
            <Button type="button" onPress={advanceAnswer}>
              {isLast ? "See results" : "Next question"}
            </Button>
          )}
        </QuizActionBar>
      </QuizPanelBody>
    </QuizPanel>
  );
}
