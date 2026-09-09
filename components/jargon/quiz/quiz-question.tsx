"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { QuizPanel } from "@/components/jargon/quiz/quiz-ui";
import { QuizAnswerChoices } from "@/components/jargon/quiz/quiz-answer-choices";
import { QuizQuestionFooter } from "@/components/jargon/quiz/quiz-question-footer";
import type { QuizQuestion } from "@/lib/quiz/types";
import { gradeMcqAnswer, gradeTrueFalseAnswer } from "@/lib/quiz/grade";
import {
  canSubmitAnswer,
  initialAnswerState,
  quizAnswerReducer,
  splitPromptQuote,
} from "@/components/jargon/quiz/quiz-question-state";

type QuizQuestionViewProps = {
  question: QuizQuestion;
  termLabel: string;
  current: number;
  total: number;
  correct: number;
  isLast: boolean;
  onAnswer: (passed: boolean) => void;
  isSubmitting: boolean;
};

export function QuizQuestionView({
  question,
  current,
  total,
  correct,
  isLast,
  onAnswer,
  isSubmitting,
}: QuizQuestionViewProps) {
  const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0;
  const [state, dispatch] = useReducer(quizAnswerReducer, initialAnswerState);
  // Brief pop when the advance button unlocks, so the lockout reads as
  // "getting ready" instead of an unresponsive click. Pure animation timing,
  // not part of the answer lifecycle, so it stays outside the reducer.
  const [justUnlocked, setJustUnlocked] = useState(false);

  const canSubmit = canSubmitAnswer(question, state);

  const stateRef = useRef({ state, canSubmit, question, onAnswer, isSubmitting });
  stateRef.current = { state, canSubmit, question, onAnswer, isSubmitting };

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
    if (current.state.phase !== "ready" || current.isSubmitting) return;
    current.onAnswer(current.state.passed);
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

      if (current.state.phase !== "ready" || current.isSubmitting) return;

      event.preventDefault();
      event.stopPropagation();
      advanceAnswer();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const submitted = state.phase !== "answering";
  const canAdvance = state.phase === "ready" && !isSubmitting;
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

        <QuizAnswerChoices
          question={question}
          state={state}
          submitted={submitted}
          onSelectOption={(optionId) => dispatch({ type: "SELECT_MCQ_OPTION", optionId })}
          onSelectTrueFalse={(value) => dispatch({ type: "SELECT_TRUE_FALSE", value })}
        />
      </div>

      <QuizQuestionFooter
        correct={correct}
        progressPercent={progressPercent}
        submitted={submitted}
        isLast={isLast}
        canSubmit={canSubmit}
        canAdvance={canAdvance}
        justUnlocked={justUnlocked}
        onSubmit={submitAnswer}
        onAdvance={advanceAnswer}
      />
    </QuizPanel>
  );
}
