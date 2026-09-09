"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getReadFeedBatchAction, type ReadQueueSeed } from "@/app/(private)/jargon/read/actions";
import type { ReviewTerm } from "@/lib/review/types";
import { useReadRevealTracking } from "@/components/jargon/read/use-read-reveal-tracking";

// Trigger the next batch once this few terms remain past the current
// position — leaves runway for both a deliberate Next-tap and a fast
// fullscreen scroll to not visibly stall on the network round trip.
const PREFETCH_REMAINING_THRESHOLD = 4;

// No "loading" state: SSR always provides a synchronous seed (terms
// populated, or caughtUp/error already known), so the queue never starts
// in an unresolved state the way a client-only fetch would.
type ReadQueueStatus = "ready" | "caughtUp" | "error";

type UseReadQueueArgs = {
  domainId: string;
  seed: ReadQueueSeed;
};

/**
 * Single shared queue for both Read surfaces (the paged view and the
 * fullscreen focus-mode feed) — one `terms[]` array, one `currentIndex`,
 * one revealed/recorded-as-read tracker. Neither surface owns any queue
 * state of its own; toggling between them is a pure display-mode switch
 * over the same hook instance, so there's nothing to reconcile when a
 * term is revealed or scrolled past in one surface and then the other is
 * shown.
 */
export function useReadQueue({ domainId, seed }: UseReadQueueArgs) {
  const [terms, setTerms] = useState<ReviewTerm[]>(seed.terms);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Background-fetch outcome, kept separate from what's currently shown —
  // see goNext/status below for why.
  const [reachedEnd, setReachedEnd] = useState(seed.caughtUp ?? false);
  const [loadError, setLoadError] = useState<string | null>(seed.error ?? null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const { reveal, isRevealed } = useReadRevealTracking(seed.revealedTermIds);

  // Refs mirror the latest render's values so stable callbacks (goNext,
  // loadMore) always read current state without needing to be recreated
  // every render — same mirroring pattern read-page.tsx already used for
  // its old nav reducer (navRef/statusRef).
  const termsRef = useRef(terms);
  const currentIndexRef = useRef(currentIndex);
  const domainIdRef = useRef(domainId);
  termsRef.current = terms;
  currentIndexRef.current = currentIndex;
  domainIdRef.current = domainId;

  const loadedIdsRef = useRef<Set<string>>(new Set(seed.terms.map((t) => t.id)));
  const inFlightRef = useRef(false);
  // Discards a response that arrives after a newer request has already
  // superseded it — e.g. a batch fetch still in flight for the old domain
  // when the user switches collections. Same pattern as
  // hooks/use-shared-domains-browse.ts's requestId guard.
  const requestIdRef = useRef(0);

  const loadMore = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsFetchingMore(true);
    const requestId = ++requestIdRef.current;
    try {
      const result = await getReadFeedBatchAction(domainIdRef.current, [...loadedIdsRef.current]);
      if (requestId !== requestIdRef.current) return; // superseded, discard

      if (result.error) {
        // Deliberately NOT surfaced unless goNext hits a genuine dead end
        // (below) — a failed background prefetch shouldn't blow away a
        // perfectly valid currentTerm the user is still looking at.
        setLoadError(result.error);
        return;
      }
      if (result.caughtUp || result.terms.length === 0) {
        setReachedEnd(true);
        return;
      }
      setReachedEnd(false);
      setLoadError(null);
      for (const term of result.terms) loadedIdsRef.current.add(term.id);
      // Update the ref synchronously here so goNext's read right after
      // `await loadMore()` sees the new terms immediately, instead of
      // waiting for the next render to reassign termsRef.current.
      const nextTerms = [...termsRef.current, ...result.terms];
      termsRef.current = nextTerms;
      setTerms(nextTerms);
    } finally {
      inFlightRef.current = false;
      setIsFetchingMore(false);
    }
  }, []);

  // Keep a few terms of runway ahead of wherever the user actually is.
  // currentIndex is the ONE shared position — the paged view advances it
  // one at a time (goNext), fullscreen advances it as cards scroll into
  // view (goToIndex) — so this same effect drives prefetch for both.
  useEffect(() => {
    if (reachedEnd || loadError) return;
    if (terms.length - currentIndex <= PREFETCH_REMAINING_THRESHOLD) {
      void loadMore();
    }
  }, [currentIndex, terms.length, reachedEnd, loadError, loadMore]);

  // Collection switch is lazy: it only changes what FUTURE fetches pull
  // from, never interrupts whatever term is currently on screen. Drop any
  // terms prefetched-but-not-yet-shown from the old domain so the next
  // advance pulls from the new selection instead of silently continuing
  // the old one; loadedIdsRef is left as-is (a few stale excluded ids from
  // the old domain are harmless — exclude-lists only ever prevent
  // re-showing something, never wrongly show it).
  const previousDomainIdRef = useRef(domainId);
  useEffect(() => {
    if (previousDomainIdRef.current === domainId) return;
    previousDomainIdRef.current = domainId;
    requestIdRef.current++; // discard any response still in flight for the old domain
    setTerms((current) => current.slice(0, currentIndexRef.current + 1));
    setReachedEnd(false);
    setLoadError(null);
  }, [domainId]);

  // If the next term isn't loaded yet, try to fetch it. Whether that
  // succeeds or not, advancing past the last loaded term (even to the
  // one-past-the-end sentinel index) is what makes currentTerm become
  // null and the caughtUp/error panel show — mirroring the old reducer's
  // explicit "clear" on a genuine dead end, while a mid-session
  // *background* prefetch failure (handled by the effect above) never
  // reaches this path at all.
  const goNext = useCallback(async () => {
    if (currentIndexRef.current + 1 < termsRef.current.length) {
      setCurrentIndex(currentIndexRef.current + 1);
      return;
    }
    await loadMore();
    setCurrentIndex(
      currentIndexRef.current + 1 < termsRef.current.length
        ? currentIndexRef.current + 1
        : termsRef.current.length,
    );
  }, [loadMore]);

  const goPrevious = useCallback(() => {
    setCurrentIndex((current) => Math.max(0, current - 1));
  }, []);

  // Fullscreen's per-card exposure calls this with the card's array index
  // as it scrolls into view — only ever moves the shared position forward
  // to the furthest point reached, never backward (scrolling up to reread
  // must not "rewind" the paged view's position).
  const goToIndex = useCallback((index: number) => {
    setCurrentIndex((current) => Math.max(current, index));
  }, []);

  const currentTerm = terms[currentIndex] ?? null;
  const status: ReadQueueStatus = currentTerm ? "ready" : loadError ? "error" : "caughtUp";

  return {
    terms,
    currentIndex,
    currentTerm,
    canGoBack: currentIndex > 0,
    status,
    errorMessage: loadError,
    isFetchingMore,
    isRevealed,
    reveal,
    goNext,
    goPrevious,
    goToIndex,
    // Same function serves both "Next" and "Try again" — goNext already
    // re-attempts loadMore and re-checks when called with currentIndex
    // sitting at the past-the-end sentinel.
    retry: goNext,
  };
}

export type ReadQueue = ReturnType<typeof useReadQueue>;
