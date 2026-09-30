"use client";

import { useCallback, useRef } from "react";

// Long enough for the reader to finish looking at what they scrolled to.
const PAUSE_AFTER_USER_SCROLL_MS = 5000;

/** Keeps the sentence being narrated on screen, unless the reader has just
 *  scrolled on their own. Attach `pause` to the scroll area's wheel, touch and
 *  key events, and `keepInView` as the ref of the sentence being spoken. */
export function useNarrationAutoScroll() {
  const pausedUntil = useRef(0);

  const pause = useCallback(() => {
    pausedUntil.current = Date.now() + PAUSE_AFTER_USER_SCROLL_MS;
  }, []);

  const keepInView = useCallback((node: HTMLElement | null) => {
    if (!node || Date.now() < pausedUntil.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, []);

  return { pause, keepInView };
}
