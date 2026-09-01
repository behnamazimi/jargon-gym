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
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (!revealed) {
          onReveal();
        } else if (canRate) {
          onNext();
        }
        return;
      }

      if (revealed && canRate) {
        if (event.key === "1") {
          event.preventDefault();
          onGrade(AGAIN);
          return;
        }
        if (event.key === "2") {
          event.preventDefault();
          onGrade(HARD);
          return;
        }
        if (event.key === "3") {
          event.preventDefault();
          onGrade(GOOD);
          return;
        }
        if (event.key === "4") {
          event.preventDefault();
          onGrade(EASY);
          return;
        }
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrevious();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canRate, enabled, onGrade, onNext, onPrevious, onReveal, revealed]);
}
