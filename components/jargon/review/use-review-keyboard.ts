"use client";

import { useEffect } from "react";

type ReviewKeyboardHandlers = {
  onReveal: () => void;
  onRateKnown: () => void;
  onRateLearning: () => void;
  onPrevious: () => void;
  onNext: () => void;
  revealed: boolean;
  canRate: boolean;
  enabled: boolean;
};

export function useReviewKeyboard({
  onReveal,
  onRateKnown,
  onRateLearning,
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

      if (event.key === "1" && revealed && canRate) {
        event.preventDefault();
        onRateKnown();
        return;
      }

      if (event.key === "2" && revealed && canRate) {
        event.preventDefault();
        onRateLearning();
        return;
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
  }, [canRate, enabled, onNext, onPrevious, onRateKnown, onRateLearning, onReveal, revealed]);
}
