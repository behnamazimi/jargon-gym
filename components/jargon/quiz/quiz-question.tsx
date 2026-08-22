"use client";

import { useEffect, useRef, useState } from "react";
import { RadioGroup } from "react-aria-components";
import { Button } from "@/components/ui/button";
import { QuizChoice, type QuizChoiceResult } from "@/components/jargon/quiz/quiz-controls";
import { QuizKeyboardHint, QuizPanel } from "@/components/jargon/quiz/quiz-ui";
import type { QuizQuestion } from "@/lib/quiz/types";
import { gradeMcqAnswer, gradeTrueFalseAnswer } from "@/lib/quiz/grade";

type QuizQuestionViewProps = {
  question: QuizQuestion;
  termLabel: string;
  current: number;
  total: number;
  correct: number;
  isLast: boolean;
  onAnswer: (passed: boolean) => void;
};

function getMcqResult(
  optionId: string,
  selectedOptionIds: string[],
  correctOptionIds: string[],
  submitted: boolean,
): QuizChoiceResult {
  if (!submitted) return "default";
  if (correctOptionIds.includes(optionId)) return "correct";
  if (selectedOptionIds.includes(optionId)) return "incorrect";
  return "default";
}

function getTrueFalseResult(
  value: boolean,
  trueFalseAnswer: boolean | null,
  correctAnswer: boolean,
  submitted: boolean,
): QuizChoiceResult {
  if (!submitted) return "default";
  if (correctAnswer === value) return "correct";
  if (trueFalseAnswer === value) return "incorrect";
  return "default";
}

export function QuizQuestionView({
  question,
  current,
  total,
  correct,
  isLast,
  onAnswer,
}: QuizQuestionViewProps) {
  const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0;
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [canAdvance, setCanAdvance] = useState(false);
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

  return (
    <QuizPanel className="quiz-feedback-enter flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <h2 className="m-0 text-lg font-semibold leading-snug tracking-tight text-base-content sm:text-xl">
          {question.prompt}
        </h2>

        {question.type === "multiple_choice" ? (
          <RadioGroup
            aria-label="Answer choices"
            value={selectedOptionIds[0] ?? ""}
            onChange={selectOption}
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
                  selectedOptionIds,
                  question.correctOptionIds,
                  submitted,
                )}
              />
            ))}
          </RadioGroup>
        ) : (
          <RadioGroup
            aria-label="Answer choices"
            value={trueFalseAnswer === null ? "" : String(trueFalseAnswer)}
            onChange={(value) => setTrueFalseAnswer(value === "true")}
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
                  trueFalseAnswer,
                  question.correctAnswer,
                  submitted,
                )}
              />
            ))}
          </RadioGroup>
        )}
      </div>

      <footer className="flex shrink-0 flex-col gap-2 border-t border-base-300/60 px-5 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-xs tabular-nums text-base-content/60">
            {correct} correct · {progressPercent}%
          </p>
          <p className="m-0 hidden text-xs text-base-content/60 md:block coarse:hidden">
            <QuizKeyboardHint action={!submitted ? "check" : isLast ? "see results" : "continue"} />
          </p>
        </div>
        {!submitted ? (
          <Button
            type="button"
            onPress={submitAnswer}
            isDisabled={!canSubmit}
            className="min-h-11 w-full transition-transform active:scale-[0.96]"
          >
            Check answer
          </Button>
        ) : (
          <Button
            type="button"
            onPress={advanceAnswer}
            isDisabled={!canAdvance}
            className="min-h-11 w-full transition-transform active:scale-[0.96]"
          >
            {isLast ? "See results" : "Next question"}
          </Button>
        )}
      </footer>
    </QuizPanel>
  );
}
