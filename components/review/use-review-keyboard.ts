"use client";

import { useEffectEvent } from "react";
import { isInsideDialog } from "@/lib/dom/in-dialog";
import { reviewKeyAction, type ReviewKeyTarget } from "@/lib/review/keyboard";
import type { ReviewGrade } from "@/lib/trace";
import { useMountEffect } from "@/hooks/use-mount-effect";

type ReviewKeyboardHandlers = {
  onReveal: () => void;
  onGrade: (grade: ReviewGrade) => void;
  onPrevious: () => void;
  onNext: () => void;
  revealed: boolean;
  rated: boolean;
  enabled: boolean;
};

function classifyTarget(target: EventTarget | null): ReviewKeyTarget {
  if (!(target instanceof HTMLElement)) return "other";
  if (target.isContentEditable || target.closest("input, textarea, select")) return "editable";
  if (target.closest("button, a[href], [role='button']")) return "interactive";
  return "other";
}

function handleReviewKeyDown(event: KeyboardEvent, handlers: ReviewKeyboardHandlers) {
  if (!handlers.enabled || isInsideDialog(event.target)) return;

  const action = reviewKeyAction(
    {
      key: event.key,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      repeat: event.repeat,
      target: classifyTarget(event.target),
    },
    { revealed: handlers.revealed, rated: handlers.rated },
  );

  if (action.type === "ignore") return;
  event.preventDefault();

  switch (action.type) {
    case "reveal":
      handlers.onReveal();
      break;
    case "grade":
      handlers.onGrade(action.grade);
      break;
    case "previous":
      handlers.onPrevious();
      break;
    case "next":
      handlers.onNext();
      break;
  }
}

export function useReviewKeyboard(handlers: ReviewKeyboardHandlers) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    handleReviewKeyDown(event, handlers);
  });

  useMountEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}
