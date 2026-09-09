"use client";

import { useEffect } from "react";
import { AGAIN, EASY, GOOD, HARD, type ReviewGrade } from "@/lib/trace";

type ReviewKeyboardHandlers = {
  onReveal: () => void;
  onGrade: (grade: ReviewGrade) => void;
  onPrevious: () => void;
  onNext: () => void;
  revealed: boolean;
  canRate: boolean;
  enabled: boolean;
};

const GRADE_KEYS: Record<string, ReviewGrade> = {
  "1": AGAIN,
  "2": HARD,
  "3": GOOD,
  "4": EASY,
};

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable)
  );
}

/** Space/Enter reveal the term, or advance once it's revealed and ratable. Returns true if handled. */
function handleRevealOrNext(
  event: KeyboardEvent,
  {
    revealed,
    canRate,
    onReveal,
    onNext,
  }: Pick<ReviewKeyboardHandlers, "revealed" | "canRate" | "onReveal" | "onNext">,
) {
  if (event.key !== " " && event.key !== "Enter") return false;
  event.preventDefault();
  if (!revealed) {
    onReveal();
  } else if (canRate) {
    onNext();
  }
  return true;
}

/** Digit keys 1-4 grade the revealed term. Returns true if handled. */
function handleGradeKey(event: KeyboardEvent, onGrade: ReviewKeyboardHandlers["onGrade"]) {
  const grade = GRADE_KEYS[event.key];
  if (grade === undefined) return false;
  event.preventDefault();
  onGrade(grade);
  return true;
}

/** Arrow keys navigate between terms. Returns true if handled. */
function handleArrowKeys(
  event: KeyboardEvent,
  { onPrevious, onNext }: Pick<ReviewKeyboardHandlers, "onPrevious" | "onNext">,
) {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    onPrevious();
    return true;
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    onNext();
    return true;
  }
  return false;
}

export function useReviewKeyboard({
  onReveal,
  onGrade,
  onPrevious,
  onNext,
  revealed,
  canRate,
  enabled,
}: ReviewKeyboardHandlers) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      if (handleRevealOrNext(event, { revealed, canRate, onReveal, onNext })) return;
      if (revealed && canRate && handleGradeKey(event, onGrade)) return;
      handleArrowKeys(event, { onPrevious, onNext });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canRate, enabled, onGrade, onNext, onPrevious, onReveal, revealed]);
}
