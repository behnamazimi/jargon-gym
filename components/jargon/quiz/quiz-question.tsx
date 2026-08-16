"use client";

import { Circle, CircleDot } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { QuizChoice } from "@/components/jargon/quiz/quiz-controls";
import {
  QuizActionBar,
  QuizFeedback,
  QuizKeyboardHint,
  QuizPanel,
  QuizPanelBody,
} from "@/components/jargon/quiz/quiz-ui";
import type { QuizQuestion } from "@/lib/quiz/types";
import { gradeMcqAnswer, gradeTrueFalseAnswer } from "@/lib/quiz/grade";

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
  const [canAdvance, setCanAdvance] = useState(false);
  const [passed, setPassed] = useState(false);
  const gradedPassedRef = useRef(false);

  const canSubmit =
    question.type === "multiple_choice" ? selectedOptionIds.length > 0 : trueFalseAnswer !== null;

  const stateRef = useRef({
    submitted,
    canSubmit,
    canAdvance,
    question,
    selectedOptionIds,
    trueFalseAnswer,
    onAnswer,
  });

  stateRef.current = {
    submitted,
    canSubmit,
    canAdvance,
    question,
    selectedOptionIds,
    trueFalseAnswer,
    onAnswer,
  };

  // A real double-click delivers two click events in quick succession. Without this
  // delay, the first click submits and the second immediately lands on the button's
  // new "Next question" position, skipping the feedback entirely.
  const ADVANCE_LOCKOUT_MS = 350;

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
    setCanAdvance(false);
    setTimeout(() => setCanAdvance(true), ADVANCE_LOCKOUT_MS);
  }

  function advanceAnswer() {
    const state = stateRef.current;
    if (!state.submitted || !state.canAdvance) return;
    state.onAnswer(gradedPassedRef.current);
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
        submitAnswer();
        return;
      }

      if (!state.canAdvance) return;

      event.preventDefault();
      event.stopPropagation();
      advanceAnswer();
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
        <h2 className="m-0 text-sm font-semibold leading-snug">{question.prompt}</h2>

        {question.type === "multiple_choice" ? (
          <div className="flex flex-col gap-2.5 pt-1.5">
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
          <div className="grid gap-2.5 pt-1.5 sm:grid-cols-2">
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

        <QuizActionBar hint={!submitted ? <QuizKeyboardHint action="check" /> : undefined}>
          {!submitted ? (
            <Button type="button" onPress={submitAnswer} isDisabled={!canSubmit}>
              Check answer
            </Button>
          ) : (
            <Button type="button" onPress={advanceAnswer} isDisabled={!canAdvance}>
              {isLast ? "See results" : "Next question"}
            </Button>
          )}
        </QuizActionBar>

        {submitted ? (
          <div className="space-y-2">
            {!passed ? (
              <QuizFeedback passed={passed} title="Not quite." detail={feedbackDetail} />
            ) : null}
            <p className="m-0 text-xs text-base-content/60">
              <QuizKeyboardHint action={isLast ? "see results" : "continue"} />
            </p>
          </div>
        ) : null}
      </QuizPanelBody>
    </QuizPanel>
  );
}
