"use client";

import { prefetchTermDetails } from "./details-store";

/** Rows this far below (or above) the screen start loading their details,
 *  so a card is usually ready by the time it is tapped. */
const PREFETCH_MARGIN = "600px 0px";

let observer: IntersectionObserver | null = null;
const rows = new WeakMap<Element, { termId: string; scope: string }>();

function sharedObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      const nearByScope = new Map<string, string[]>();
      for (const entry of entries) {
        const row = entry.isIntersecting ? rows.get(entry.target) : undefined;
        if (!row) continue;
        nearByScope.set(row.scope, [...(nearByScope.get(row.scope) ?? []), row.termId]);
      }
      for (const [scope, ids] of nearByScope) prefetchTermDetails(scope, ids);
    },
    { rootMargin: PREFETCH_MARGIN },
  );
  return observer;
}

/** For a row's ref callback: loads the term's details once it nears the
 *  screen. Returns the cleanup React calls when the row unmounts. */
export function observeRowForDetails(element: Element, termId: string, scope: string) {
  rows.set(element, { termId, scope });
  const shared = sharedObserver();
  shared.observe(element);
  return () => shared.unobserve(element);
}
