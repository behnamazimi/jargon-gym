"use client";

import { ArrowRight, Trophy } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { RadioGroup } from "react-aria-components";
import { Button } from "@/components/ui/button";
import { QuizChoice, type QuizChoiceResult } from "@/components/jargon/quiz/quiz-controls";
import { QuizKeyboardHint, QuizPanel } from "@/components/jargon/quiz/quiz-ui";
import type { QuizQuestion } from "@/lib/quiz/types";
import { gradeMcqAnswer, gradeTrueFalseAnswer } from "@/lib/quiz/grade";
import { cn } from "@/lib/utils";

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

// The check→next flow moves through exactly three phases: picking an answer,
// locked while feedback shows, then ready to advance. Modeling it as a
// reducer makes combinations like "locked but advance is enabled" impossible.
type QuizAnswerPhase = "answering" | "locked" | "ready";

type QuizAnswerState = {
  phase: QuizAnswerPhase;
  selectedOptionIds: string[];
  trueFalseAnswer: boolean | null;
  passed: boolean;
};

type QuizAnswerAction =
  | { type: "SELECT_MCQ_OPTION"; optionId: string }
  | { type: "SELECT_TRUE_FALSE"; value: boolean }
  | { type: "SUBMIT"; passed: boolean }
  | { type: "UNLOCK" };

const initialAnswerState: QuizAnswerState = {
  phase: "answering",
  selectedOptionIds: [],
  trueFalseAnswer: null,
  passed: false,
};

function quizAnswerReducer(state: QuizAnswerState, action: QuizAnswerAction): QuizAnswerState {
  switch (action.type) {
    case "SELECT_MCQ_OPTION":
      if (state.phase !== "answering") return state;
      return { ...state, selectedOptionIds: [action.optionId] };
    case "SELECT_TRUE_FALSE":
      if (state.phase !== "answering") return state;
      return { ...state, trueFalseAnswer: action.value };
    case "SUBMIT":
      if (state.phase !== "answering") return state;
      return { ...state, phase: "locked", passed: action.passed };
    case "UNLOCK":
      if (state.phase !== "locked") return state;
      return { ...state, phase: "ready" };
  }
}

// Example-judgment true/false questions pack a quoted scenario onto a second
// line so it can be styled apart from the question itself. Every other
// question's prompt is a single line and falls through unchanged.
function splitPromptQuote(prompt: string): { question: string; quote: string | null } {
  const newlineIndex = prompt.indexOf("\n");
  if (newlineIndex === -1) return { question: prompt, quote: null };

  return {
    question: prompt.slice(0, newlineIndex).trim(),
    quote: prompt.slice(newlineIndex + 1).trim(),
  };
}

function canSubmitAnswer(question: QuizQuestion, state: QuizAnswerState): boolean {
  return question.type === "multiple_choice"
    ? state.selectedOptionIds.length > 0
    : state.trueFalseAnswer !== null;
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
  const [state, dispatch] = useReducer(quizAnswerReducer, initialAnswerState);
  // Brief pop when the advance button unlocks, so the lockout reads as
  // "getting ready" instead of an unresponsive click. Pure animation timing,
  // not part of the answer lifecycle, so it stays outside the reducer.
  const [justUnlocked, setJustUnlocked] = useState(false);

  const canSubmit = canSubmitAnswer(question, state);

  const stateRef = useRef({ state, canSubmit, question, onAnswer });
  stateRef.current = { state, canSubmit, question, onAnswer };

  const lockoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unlockPopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (lockoutTimeoutRef.current) clearTimeout(lockoutTimeoutRef.current);
      if (unlockPopTimeoutRef.current) clearTimeout(unlockPopTimeoutRef.current);
    };
  }, []);

  // A real double-click delivers two click events in quick succession. Without this
  // delay, the first click submits and the second immediately lands on the button's
  // new "Next question" position, skipping the feedback entirely.
  const ADVANCE_LOCKOUT_MS = 350;

  function submitAnswer() {
    const current = stateRef.current;
    if (current.state.phase !== "answering" || !current.canSubmit) return;

    const result =
      current.question.type === "multiple_choice"
        ? gradeMcqAnswer(current.question, current.state.selectedOptionIds)
        : gradeTrueFalseAnswer(current.question, current.state.trueFalseAnswer ?? false);

    dispatch({ type: "SUBMIT", passed: result });
    lockoutTimeoutRef.current = setTimeout(() => {
      dispatch({ type: "UNLOCK" });
      setJustUnlocked(true);
      unlockPopTimeoutRef.current = setTimeout(() => setJustUnlocked(false), 260);
    }, ADVANCE_LOCKOUT_MS);
  }

  function advanceAnswer() {
    const current = stateRef.current;
    if (current.state.phase !== "ready") return;
    current.onAnswer(current.state.passed);
  }

  function selectOption(optionId: string) {
    dispatch({ type: "SELECT_MCQ_OPTION", optionId });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter") return;

      const target = event.target as HTMLElement;
      if (target.tagName === "TEXTAREA") return;

      const current = stateRef.current;

      if (current.state.phase === "answering") {
        if (!current.canSubmit) return;

        event.preventDefault();
        event.stopPropagation();
        submitAnswer();
        return;
      }

      if (current.state.phase !== "ready") return;

      event.preventDefault();
      event.stopPropagation();
      advanceAnswer();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const submitted = state.phase !== "answering";
  const canAdvance = state.phase === "ready";
  const { question: promptQuestion, quote: promptQuote } = splitPromptQuote(question.prompt);

  return (
    <QuizPanel className="quiz-feedback-enter flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <h2 className="m-0 text-lg font-semibold leading-snug tracking-tight text-base-content sm:text-xl">
          {promptQuestion}
        </h2>

        {promptQuote ? (
          <blockquote className="mt-3 rounded-xl border-l-4 border-primary/40 bg-base-200/60 px-4 py-3 text-base-content/80">
            <span className="text-base leading-snug">{promptQuote}</span>
          </blockquote>
        ) : null}

        {question.type === "multiple_choice" ? (
          <RadioGroup
            aria-label="Answer choices"
            value={state.selectedOptionIds[0] ?? ""}
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
                  state.selectedOptionIds,
                  question.correctOptionIds,
                  submitted,
                )}
              />
            ))}
          </RadioGroup>
        ) : (
          <RadioGroup
            aria-label="Answer choices"
            value={state.trueFalseAnswer === null ? "" : String(state.trueFalseAnswer)}
            onChange={(value) => dispatch({ type: "SELECT_TRUE_FALSE", value: value === "true" })}
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
            className={cn(
              "min-h-11 w-full gap-1.5 transition-transform active:scale-[0.96]",
              justUnlocked && "quiz-advance-ready",
            )}
          >
            <span
              key={isLast ? "results" : "next"}
              className="quiz-advance-label-enter inline-flex items-center gap-1.5"
            >
              {isLast ? "See results" : "Next question"}
              {isLast ? (
                <Trophy className="size-4 shrink-0" aria-hidden strokeWidth={2} />
              ) : (
                <ArrowRight className="size-4 shrink-0" aria-hidden strokeWidth={2} />
              )}
            </span>
          </Button>
        )}
      </footer>
    </QuizPanel>
  );
}
