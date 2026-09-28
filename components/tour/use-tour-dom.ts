"use client";

import { useSyncExternalStore } from "react";
import { TOUR_TARGETS, type TourTargetId } from "@/lib/tour/targets";

const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;
let frame = 0;

function notify() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    for (const listener of listeners) listener();
  });
}

/** One shared observer for every tour hook; checks are batched per frame. */
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
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0 || !observer) return;
    observer.disconnect();
    observer = null;
    window.removeEventListener("resize", notify);
    cancelAnimationFrame(frame);
    frame = 0;
  };
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

function visibleTargetsKey() {
  return TOUR_TARGETS.filter((id) => findVisibleTarget(id) !== null).join(",");
}

function hasBlockingDialog() {
  for (const element of document.querySelectorAll(
    '[aria-modal="true"], [role="dialog"], [role="alertdialog"]',
  )) {
    // The tour's own card is a dialog too; it never blocks itself.
    if (!element.closest("[data-tour-card]") && isOnScreen(element)) return true;
  }
  return false;
}

export function useVisibleTourTargets(): ReadonlySet<TourTargetId> {
  const key = useSyncExternalStore(subscribe, visibleTargetsKey, () => "");
  return new Set(key ? (key.split(",") as TourTargetId[]) : []);
}

/** The element a step points at, re-resolved when the page swaps it out. */
export function useTourTarget(id: TourTargetId | null): HTMLElement | null {
  return useSyncExternalStore(
    subscribe,
    () => (id ? findVisibleTarget(id) : null),
    () => null,
  );
}

/** True while a sheet, modal, or popover dialog is open, so the tour steps aside. */
export function useBlockingDialogOpen(): boolean {
  return useSyncExternalStore(subscribe, hasBlockingDialog, () => false);
}
