import { useCallback, useEffect, useRef } from "react";
import type { ReadQueue } from "@/components/jargon/read/use-read-queue";
import { PLATFORM_MEDIA } from "@/lib/platform";

function scrollSnapBehavior(): ScrollBehavior {
  return window.matchMedia(PLATFORM_MEDIA.reducedMotion).matches ? "instant" : "smooth";
}

export function useReadFullscreenScroll(queue: ReadQueue) {
  const cardNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const endSlideRef = useRef<HTMLDivElement>(null);
  const hasScrolledToInitialRef = useRef(false);
  // When Mark known has to wait on a fetch (last loaded card), remember
  // which index we left so the effect below can scroll once goNext lands.
  const pendingAdvanceFromIndexRef = useRef<number | null>(null);
  // `queue` is a fresh object every render (its methods are individually
  // stable, but the returned bundle isn't) — mirrored into a ref so
  // handleExposed below can stay referentially stable itself instead of
  // changing identity on every render. Without this, every currently-
  // mounted card's IntersectionObserver effect (keyed on `onExposed`)
  // would tear down and recreate on every scroll-driven re-render, and a
  // freshly re-created observer re-evaluates intersection immediately —
  // re-firing exposure for a card that already fired moments earlier.
  const queueRef = useRef(queue);
  queueRef.current = queue;

  // Fullscreen renders the entire shared queue, not just what's ahead of
  // the current position, so entering it needs one explicit scroll to
  // wherever that position already is — otherwise it would default to
  // showing the very first term instead of resuming where the user was.
  useEffect(() => {
    if (hasScrolledToInitialRef.current) return;
    const currentTerm = queue.terms[queue.currentIndex];
    if (!currentTerm) return;
    const node = cardNodesRef.current.get(currentTerm.id);
    if (!node) return;
    hasScrolledToInitialRef.current = true;
    node.scrollIntoView({ behavior: "instant", block: "start" });
  }, [queue.terms, queue.currentIndex]);

  const handleExposed = useCallback((index: number, termId: string) => {
    queueRef.current.reveal(termId);
    queueRef.current.goToIndex(index);
  }, []);

  const scrollToTermOrEnd = useCallback((index: number) => {
    const term = queueRef.current.terms[index];
    const node = term ? cardNodesRef.current.get(term.id) : null;
    (node ?? endSlideRef.current)?.scrollIntoView({
      behavior: scrollSnapBehavior(),
      block: "start",
    });
  }, []);

  const handleMarkedKnown = useCallback(
    (index: number) => {
      const nextIndex = index + 1;
      if (queueRef.current.terms[nextIndex]) {
        queueRef.current.goToIndex(nextIndex);
        scrollToTermOrEnd(nextIndex);
        return;
      }
      pendingAdvanceFromIndexRef.current = index;
      void queueRef.current.goNext();
    },
    [scrollToTermOrEnd],
  );

  useEffect(() => {
    const fromIndex = pendingAdvanceFromIndexRef.current;
    if (fromIndex === null) return;
    if (queue.currentIndex === fromIndex && queue.status === "ready") return;
    pendingAdvanceFromIndexRef.current = null;
    scrollToTermOrEnd(queue.currentIndex);
  }, [queue.currentIndex, queue.status, queue.terms, scrollToTermOrEnd]);

  return { cardNodesRef, endSlideRef, handleExposed, handleMarkedKnown };
}
