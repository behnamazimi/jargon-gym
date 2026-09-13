"use client";

import { useEffectEvent } from "react";
import { isTypingTarget } from "@/components/jargon/read/read-page-helpers";
import type { ReadQueue } from "@/components/jargon/read/use-read-queue";
import { useMountEffect } from "@/hooks/use-mount-effect";

function handleReadEnterKey(event: KeyboardEvent, fullscreenActive: boolean, queue: ReadQueue) {
  if (fullscreenActive) return;
  if (event.key !== "Enter") return;
  if (queue.status !== "ready" || isTypingTarget(event.target)) return;

  const term = queue.currentTerm;
  if (!term) return;

  event.preventDefault();
  if (!queue.isRevealed(term.id)) {
    queue.reveal(term.id);
  } else {
    void queue.goNext();
  }
}

export function useReadEnterKey(fullscreenActive: boolean, queue: ReadQueue) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    handleReadEnterKey(event, fullscreenActive, queue);
  });

  useMountEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}
