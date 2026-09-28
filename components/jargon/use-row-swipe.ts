"use client";

import { useRef } from "react";

const AXIS_LOCK_PX = 8;
const COMMIT_PX = 80;
const OVERDRAG_RESISTANCE = 0.3;
// Long enough to swallow the press react-aria fires as the finger lifts.
const SWIPE_GUARD_MS = 300;

type SwipeState = { startX: number; startY: number; dx: number; axis: "x" | "y" | null };

/** Swipe-left on a Library row, touch only. The row slides over a layer
 *  behind it and commits past COMMIT_PX; styles go straight to the DOM so
 *  a drag never re-renders the list. */
export function useRowSwipe({ enabled, onCommit }: { enabled: boolean; onCommit: () => void }) {
  const rowRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SwipeState | null>(null);
  const justSwipedRef = useRef(false);

  function paint(dx: number, animate: boolean) {
    const row = rowRef.current;
    if (row) {
      row.style.transition = animate ? "transform 200ms ease-out" : "none";
      row.style.transform = dx === 0 ? "" : `translateX(${dx}px)`;
    }
    if (layerRef.current) {
      layerRef.current.style.opacity = String(Math.min(Math.abs(dx) / COMMIT_PX, 1));
    }
  }

  function onTouchStart(event: React.TouchEvent) {
    if (!enabled) return;
    const touch = event.touches[0];
    stateRef.current = { startX: touch.clientX, startY: touch.clientY, dx: 0, axis: null };
  }

  function onTouchMove(event: React.TouchEvent) {
    const state = stateRef.current;
    if (!state) return;
    const touch = event.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;

    if (state.axis === null) {
      if (Math.abs(dx) > AXIS_LOCK_PX && Math.abs(dx) > Math.abs(dy)) {
        state.axis = "x";
        justSwipedRef.current = true;
      } else if (Math.abs(dy) > AXIS_LOCK_PX) {
        state.axis = "y";
      }
    }
    if (state.axis !== "x") return;

    state.dx = Math.min(dx, 0);
    const shown =
      state.dx < -COMMIT_PX ? -COMMIT_PX + (state.dx + COMMIT_PX) * OVERDRAG_RESISTANCE : state.dx;
    paint(shown, false);
  }

  function onTouchEnd() {
    const state = stateRef.current;
    stateRef.current = null;
    if (!state || state.axis !== "x") return;

    window.setTimeout(() => {
      justSwipedRef.current = false;
    }, SWIPE_GUARD_MS);
    paint(0, true);
    if (state.dx <= -COMMIT_PX) onCommit();
  }

  function onTouchCancel() {
    stateRef.current = null;
    justSwipedRef.current = false;
    paint(0, true);
  }

  return {
    rowRef,
    layerRef,
    justSwipedRef,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
  };
}
