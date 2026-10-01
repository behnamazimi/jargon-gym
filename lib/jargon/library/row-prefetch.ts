"use client";

import { prefetchTermDetails } from "./details-store";

/** Rows this far below (or above) the screen start loading their details,
 *  so a card is usually ready by the time it is tapped. */
const PREFETCH_MARGIN = "600px 0px";

let observer: IntersectionObserver | null = null;
const termIds = new WeakMap<Element, string>();

function sharedObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      const near = entries.flatMap((entry) => {
        const id = entry.isIntersecting ? termIds.get(entry.target) : undefined;
        return id ? [id] : [];
      });
      if (near.length > 0) prefetchTermDetails(near);
    },
    { rootMargin: PREFETCH_MARGIN },
  );
  return observer;
}

/** For a row's ref callback: loads the term's details once it nears the
 *  screen. Returns the cleanup React calls when the row unmounts. */
export function observeRowForDetails(element: Element, termId: string) {
  termIds.set(element, termId);
  const shared = sharedObserver();
  shared.observe(element);
  return () => shared.unobserve(element);
}
