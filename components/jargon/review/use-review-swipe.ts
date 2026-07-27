"use client";

import { useRef, type RefObject } from "react";

const SWIPE_THRESHOLD = 50;

type ReviewSwipeHandlers = {
  onReveal: () => void;
  onPrevious: () => void;
  onNext: () => void;
  enabled: boolean;
};

export function useReviewSwipe(
  ref: RefObject<HTMLElement | null>,
  { onReveal, onPrevious, onNext, enabled }: ReviewSwipeHandlers,
) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(event: React.TouchEvent) {
    if (!enabled) return;
    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (!enabled || !startRef.current) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startRef.current.x;
    const deltaY = touch.clientY - startRef.current.y;
    startRef.current = null;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absY > SWIPE_THRESHOLD && absY > absX && deltaY < 0) {
      onReveal();
      return;
    }

    if (absX > SWIPE_THRESHOLD && absX > absY) {
      if (deltaX < 0) {
        onNext();
      } else {
        onPrevious();
      }
    }
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    ref,
  };
}
