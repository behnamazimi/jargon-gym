"use client";

import { useMountEffect } from "@/hooks/use-mount-effect";

/** Places that keep their own scrolling: the tip, open sheets and menus, and
 *  full-screen takeovers like Read's focus mode. */
const SCROLLABLE_AREAS =
  '[data-tour-card], [aria-modal="true"], [role="dialog"], [data-tour-blocking]';
const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"]);

function isInScrollableArea(target: EventTarget | null) {
  return target instanceof Element && target.closest(SCROLLABLE_AREAS) !== null;
}

/** Keeps the page from scrolling away from the highlighted element while a
 *  tip is up. The page stays clickable (the tour relies on that), so this
 *  blocks the scroll gestures instead of covering the page. */
export function useTourScrollLock() {
  useMountEffect(() => {
    const blockScroll = (event: WheelEvent | TouchEvent) => {
      const isZoom =
        (event instanceof WheelEvent && event.ctrlKey) ||
        (event instanceof TouchEvent && event.touches.length > 1);
      if (isZoom || !event.cancelable || isInScrollableArea(event.target)) return;
      event.preventDefault();
    };
    const blockScrollKeys = (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (SCROLL_KEYS.has(event.key) && (!active || active === document.body)) {
        event.preventDefault();
      }
    };
    document.addEventListener("wheel", blockScroll, { passive: false });
    document.addEventListener("touchmove", blockScroll, { passive: false });
    document.addEventListener("keydown", blockScrollKeys);
    return () => {
      document.removeEventListener("wheel", blockScroll);
      document.removeEventListener("touchmove", blockScroll);
      document.removeEventListener("keydown", blockScrollKeys);
    };
  });
}
