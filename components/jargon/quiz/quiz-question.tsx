"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/quiz/types";
import { gradeMcqAnswer, gradeTrueFalseAnswer } from "@/lib/quiz/types";

type QuizQuestionViewProps = {
  question: QuizQuestion;
  termLabel: string;
  isLast: boolean;
  onAnswer: (passed: boolean) => void;
};

export function QuizQuestionView({
  question,
  termLabel: _termLabel,
  isLast,
  onAnswer,
}: QuizQuestionViewProps) {
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

  return (
    <Card className="space-y-5 p-5 ring-foreground/5 sm:p-6">
      <div className="space-y-2">
        <p className="m-0 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {question.type === "multiple_choice" ? "Multiple choice" : "True or false"}
        </p>
        <h2 className="m-0 text-[16px] font-semibold leading-snug">{question.prompt}</h2>
      </div>

      {question.type === "multiple_choice" ? (
        <div className="flex w-full max-w-[465px] flex-col gap-2">
          {question.options.map((option) => {
            const isSelected = selectedOptionIds.includes(option.id);
            const isCorrect = question.correctOptionIds.includes(option.id);

            return (
              <label
                key={option.id}
                className={cn(
                  "flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-[13px] transition-colors",
                  submitted && isCorrect && "border-primary/40 bg-primary/10",
                  submitted &&
                    isSelected &&
                    !isCorrect &&
                    "border-destructive/40 bg-destructive/10",
                  !submitted && isSelected && "border-primary/30 bg-primary/5",
                  submitted && "cursor-default",
                )}
              >
                <Checkbox
                  isSelected={isSelected}
                  isDisabled={submitted}
                  onChange={() => selectOption(option.id)}
                  className="mt-0.5 rounded-full"
                />
                <span>{option.text}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="flex w-full max-w-[465px] flex-col gap-2">
          {[true, false].map((value) => {
            const isSelected = trueFalseAnswer === value;
            const isCorrect = question.correctAnswer === value;

            return (
              <Button
                key={String(value)}
                type="button"
                variant="outline"
                onPress={() => !submitted && setTrueFalseAnswer(value)}
                isDisabled={submitted}
                className={cn(
                  "w-full",
                  submitted && isCorrect && "border-primary/40 bg-primary/10 text-foreground",
                  submitted &&
                    isSelected &&
                    !isCorrect &&
                    "border-destructive/40 bg-destructive/10 text-destructive",
                  !submitted && isSelected && "border-primary/30 bg-primary/5",
                )}
              >
                {value ? "True" : "False"}
              </Button>
            );
          })}
        </div>
      )}

      {submitted ? (
        <Alert variant={passed ? "default" : "destructive"}>
          {passed ? (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          ) : (
            <XCircle className="size-4 shrink-0" aria-hidden />
          )}
          <AlertDescription className="space-y-1">
            <p className="m-0 font-medium">{passed ? "Correct!" : "Not quite."}</p>
            {!passed && question.type === "multiple_choice" && correctOptionLabels.length > 0 ? (
              <p className="m-0 text-[12px]">
                Correct answer{correctOptionLabels.length > 1 ? "s" : ""}:{" "}
                {correctOptionLabels.join("; ")}
              </p>
            ) : null}
            {!passed && question.type === "true_false" ? (
              <p className="m-0 text-[12px]">
                The statement is {question.correctAnswer ? "true" : "false"}.
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[12px] text-muted-foreground">
          {submitted ? "Press Enter for next" : "Press Enter to check"}
        </p>
        <div className="flex gap-2">
          {!submitted ? (
            <Button type="button" onPress={submitAnswer} isDisabled={!canSubmit}>
              Check answer
            </Button>
          ) : (
            <Button type="button" onPress={advanceAnswer}>
              {isLast ? "See results" : "Next"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
