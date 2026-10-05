"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { QuizPanel } from "@/components/quiz/quiz-ui";
import { QuizAnswerChoices } from "@/components/quiz/quiz-answer-choices";
import { QuizQuestionFooter } from "@/components/quiz/quiz-question-footer";
import type { QuizQuestion } from "@/lib/quiz/types";
import { gradeAnswer } from "@/lib/quiz/grade";
import { quizFeedbackLine } from "@/lib/quiz/templates/registry";
import { quizResponseForKey } from "@/lib/quiz/keyboard";
import {
  canSubmitAnswer,
  initialAnswerState,
  quizAnswerReducer,
} from "@/components/quiz/quiz-question-state";

/** Radios are inputs too, so only fields you type into count. */
function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === "TEXTAREA") return true;
  return (
    target instanceof HTMLInputElement && target.type !== "radio" && target.type !== "checkbox"
  );
}

type QuizQuestionViewProps = {
  question: QuizQuestion;
  termLabel: string;
  correct: number;
  isLast: boolean;
  onAnswer: (passed: boolean) => void;
};

export function QuizQuestionView({ question, correct, isLast, onAnswer }: QuizQuestionViewProps) {
  const [state, dispatch] = useReducer(quizAnswerReducer, initialAnswerState);
  // Brief pop when the advance button unlocks, so the lockout reads as
  // "getting ready" instead of an unresponsive click. Pure animation timing,
  // not part of the answer lifecycle, so it stays outside the reducer.
  const [justUnlocked, setJustUnlocked] = useState(false);

  const canSubmit = canSubmitAnswer(state);

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

    if (!current.state.response) return;

    dispatch({
      type: "SUBMIT",
      passed: gradeAnswer(current.question, current.state.response),
    });
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const response = quizResponseForKey(
        {
          key: event.key,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          repeat: event.repeat,
          typing: isTextEntryTarget(event.target),
        },
        stateRef.current.question,
      );
      if (response) {
        if (stateRef.current.state.phase !== "answering") return;
        event.preventDefault();
        dispatch({ type: "RESPOND", response });
        return;
      }

      if (event.key !== "Enter" || event.isComposing) return;

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
  const feedbackLine = submitted ? quizFeedbackLine(question, state.passed, state.response) : null;

  return (
    <QuizPanel className="quiz-feedback-enter flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <h2 className="m-0 text-lg font-medium leading-snug text-base-content sm:text-xl">
          {question.prompt}
        </h2>

        {question.quote ? (
          <blockquote className="mt-3 rounded-field border-l-4 border-primary/40 bg-base-200/60 px-4 py-3 text-base-content/80">
            <span className="text-base leading-snug">{question.quote}</span>
          </blockquote>
        ) : null}

        {question.interaction === "text" && question.hint ? (
          <p className="m-0 mt-2 text-sm text-base-content/70">{question.hint}</p>
        ) : null}

        <QuizAnswerChoices
          question={question}
          response={state.response}
          submitted={submitted}
          onRespond={(response) => dispatch({ type: "RESPOND", response })}
        />

        {feedbackLine ? (
          <p role="status" className="m-0 mt-4 text-sm text-base-content/70">
            {feedbackLine}
          </p>
        ) : null}
      </div>

      <QuizQuestionFooter
        correct={correct}
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
