"use client";

import { useEffectEvent } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";

type TriageKeyboardHandlers = {
  onReveal: () => void;
  onKnew: () => void;
  onNotYet: () => void;
  onUndo: () => void;
  revealed: boolean;
  enabled: boolean;
};

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest("input, textarea, select") !== null)
  );
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest("button, a[href]") !== null;
}

const KEY_ACTIONS: Record<string, "knew" | "notYet" | "undo" | "reveal"> = {
  ArrowRight: "knew",
  ArrowLeft: "notYet",
  z: "undo",
  Z: "undo",
  Backspace: "undo",
  " ": "reveal",
  Enter: "reveal",
};

function handleTriageKeyDown(event: KeyboardEvent, handlers: TriageKeyboardHandlers) {
  if (!handlers.enabled || event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
  if (isTypingTarget(event.target)) return;

  const action = KEY_ACTIONS[event.key];
  if (!action) return;
  // A focused button owns Space/Enter.
  if (action === "reveal" && (handlers.revealed || isInteractiveTarget(event.target))) return;

  event.preventDefault();
  if (action === "knew") handlers.onKnew();
  else if (action === "notYet") handlers.onNotYet();
  else if (action === "undo") handlers.onUndo();
  else handlers.onReveal();
}

export function useTriageKeyboard(handlers: TriageKeyboardHandlers) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    handleTriageKeyDown(event, handlers);
  });

  useMountEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}
