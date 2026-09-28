"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { TourTargetId } from "@/lib/tour/targets";

const SCROLL_SETTLE_MS = 150;

const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;
let scrolling = false;
let scrollTimer: ReturnType<typeof setTimeout> | undefined;

function notify() {
  for (const listener of listeners) listener();
}

function handleScroll() {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    scrolling = false;
    notify();
  }, SCROLL_SETTLE_MS);
  if (scrolling) return;
  scrolling = true;
  notify();
}

/** One shared watcher for every tour hook: DOM changes, resizes, and
 *  scrolling (in any scroll container, hence capture). */
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!observer) {
    observer = new MutationObserver(notify);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "data-tour", "aria-modal", "role"],
    });
    window.addEventListener("resize", notify);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0 || !observer) return;
    observer.disconnect();
    observer = null;
    window.removeEventListener("resize", notify);
    window.removeEventListener("scroll", handleScroll, { capture: true });
    clearTimeout(scrollTimer);
    scrolling = false;
  };
}

function subscribeNothing() {
  return () => {};
}

function isOnScreen(element: Element) {
  return element.getClientRects().length > 0;
}

function findVisibleTarget(id: TourTargetId): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)) {
    if (isOnScreen(element)) return element;
  }
  return null;
}

/** Open dialogs and sheets, plus anything that declares it covers the page
 *  (`data-tour-blocking`, e.g. Read's focus mode). The tour's own card is a
 *  dialog too, so it never counts. */
function isPageCovered() {
  for (const element of document.querySelectorAll(
    '[aria-modal="true"], [role="dialog"], [role="alertdialog"], [data-tour-blocking]',
  )) {
    if (!element.closest("[data-tour-card]") && isOnScreen(element)) return true;
  }
  return false;
}

/** Which of `targets` are on screen. Watches nothing when the list is empty. */
export function useVisibleTourTargets(targets: readonly TourTargetId[]): ReadonlySet<TourTargetId> {
  const key = useSyncExternalStore(
    targets.length > 0 ? subscribe : subscribeNothing,
    () => targets.filter((id) => findVisibleTarget(id) !== null).join(","),
    () => "",
  );
  return new Set(key ? (key.split(",") as TourTargetId[]) : []);
}

/** The element a step points at, re-resolved when the page swaps it out. */
export function useTourTarget(id: TourTargetId | null): HTMLElement | null {
  return useSyncExternalStore(
    id ? subscribe : subscribeNothing,
    () => (id ? findVisibleTarget(id) : null),
    () => null,
  );
}

/** True while a dialog, sheet, or full-screen view covers the page. */
export function usePageCovered(enabled: boolean): boolean {
  return useSyncExternalStore(enabled ? subscribe : subscribeNothing, isPageCovered, () => false);
}

export type TargetBox = { top: number; left: number; width: number; height: number };

/** Where the target sits in the viewport, or null while the page is
 *  scrolling, so the tip can hide and re-anchor once things settle (sticky
 *  and fixed targets would otherwise leave it behind). */
export function useTargetBox(target: HTMLElement | null): TargetBox | null {
  const subscribeToTarget = useMemo(() => {
    if (!target) return subscribeNothing;
    return (listener: () => void) => {
      const unsubscribe = subscribe(listener);
      const resizeObserver = new ResizeObserver(listener);
      resizeObserver.observe(target);
      return () => {
        unsubscribe();
        resizeObserver.disconnect();
      };
    };
  }, [target]);

  const key = useSyncExternalStore(
    subscribeToTarget,
    () => {
      if (!target || scrolling) return "";
      const rect = target.getBoundingClientRect();
      return [rect.top, rect.left, rect.width, rect.height].map(Math.round).join(",");
    },
    () => "",
  );
  if (!key) return null;
  const [top, left, width, height] = key.split(",").map(Number);
  return { top, left, width, height };
}
