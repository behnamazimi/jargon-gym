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

/** Open dialogs, sheets, and menus, plus anything that declares it covers
 *  the page (`data-tour-blocking`, e.g. Read's focus mode). The tour's own
 *  card is a dialog too, so it never counts. */
function coveringElements(): Element[] {
  return [
    ...document.querySelectorAll(
      '[aria-modal="true"], [role="dialog"], [role="alertdialog"], [data-tour-blocking]',
    ),
  ].filter((element) => !element.closest("[data-tour-card]") && isOnScreen(element));
}

/** The first on-screen element for `id`. While something covers the page,
 *  only elements inside it count, so tips follow the user into a sheet or
 *  menu and never point at what's underneath. */
function findVisibleTarget(id: TourTargetId, covers = coveringElements()): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)) {
    if (!isOnScreen(element)) continue;
    if (covers.length === 0 || covers.some((cover) => cover.contains(element))) return element;
  }
  return null;
}

/** Which of `targets` are on screen. Watches nothing when the list is empty. */
export function useVisibleTourTargets(targets: readonly TourTargetId[]): ReadonlySet<TourTargetId> {
  const key = useSyncExternalStore(
    targets.length > 0 ? subscribe : subscribeNothing,
    () => {
      const covers = coveringElements();
      return targets.filter((id) => findVisibleTarget(id, covers) !== null).join(",");
    },
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

export type TargetBox = { top: number; left: number; width: number; height: number };

const settledBoxes = new WeakMap<HTMLElement, string>();

/** Where the target last settled in the viewport, and whether the page is
 *  scrolling right now. While scrolling the box stays put, so the tip can
 *  fade out and re-anchor once things settle (sticky and fixed targets would
 *  otherwise leave it behind) without re-rendering on every scroll event. */
export function useTargetBox(target: HTMLElement | null): {
  box: TargetBox | null;
  scrolling: boolean;
} {
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
      if (!target) return "";
      if (!scrolling) {
        const rect = target.getBoundingClientRect();
        settledBoxes.set(
          target,
          [rect.top, rect.left, rect.width, rect.height].map(Math.round).join(","),
        );
      }
      return `${scrolling ? 1 : 0}|${settledBoxes.get(target) ?? ""}`;
    },
    () => "",
  );
  const [scrollFlag, boxKey] = key.split("|");
  if (!boxKey) return { box: null, scrolling: scrollFlag === "1" };
  const [top, left, width, height] = boxKey.split(",").map(Number);
  return { box: { top, left, width, height }, scrolling: scrollFlag === "1" };
}
