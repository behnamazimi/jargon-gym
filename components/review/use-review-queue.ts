"use client";

import { useCallback, useRef, useState } from "react";
import { REVIEW_QUEUE_PREFETCH_REMAINING } from "@/lib/review/queue";
import type { ReviewQueueSeed, ReviewTerm } from "@/lib/review/types";
import { useMountEffect } from "@/hooks/use-mount-effect";

const FEED_ERROR = "Couldn't load more terms. Try again.";

async function fetchReviewFeed(
  collectionId: string,
  excludeTermIds: string[],
): Promise<ReviewQueueSeed> {
  try {
    const response = await fetch("/api/review/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId, excludeTermIds }),
      // An expired session makes the proxy redirect to the login page.
      redirect: "manual",
    });
    if (response.status === 401 || response.type === "opaqueredirect") {
      return { error: "Log in to continue.", terms: [] };
    }
    if (!response.ok) return { error: FEED_ERROR, terms: [] };
    return (await response.json()) as ReviewQueueSeed;
  } catch {
    return { error: FEED_ERROR, terms: [] };
  }
}

type ReviewQueueStatus = "ready" | "caughtUp" | "error" | "loading";

type UseReviewQueueArgs = {
  collectionId: string;
  seed: ReviewQueueSeed;
};

export function useReviewQueue({ collectionId, seed }: UseReviewQueueArgs) {
  const [terms, setTerms] = useState<ReviewTerm[]>(seed.terms);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(seed.caughtUp ?? false);
  const [loadError, setLoadError] = useState<string | null>(seed.error ?? null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const termsRef = useRef(terms);
  const currentIndexRef = useRef(currentIndex);
  const collectionIdRef = useRef(collectionId);
  const reachedEndRef = useRef(reachedEnd);
  const loadErrorRef = useRef(loadError);
  termsRef.current = terms;
  currentIndexRef.current = currentIndex;
  collectionIdRef.current = collectionId;
  reachedEndRef.current = reachedEnd;
  loadErrorRef.current = loadError;

  const loadedIdsRef = useRef<Set<string>>(new Set(seed.terms.map((t) => t.id)));
  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadMore = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsFetchingMore(true);
    const requestId = ++requestIdRef.current;
    try {
      const result = await fetchReviewFeed(collectionIdRef.current, [...loadedIdsRef.current]);
      if (requestId !== requestIdRef.current) return;

      if (result.error) {
        loadErrorRef.current = result.error;
        setLoadError(result.error);
        return;
      }
      if (result.caughtUp || result.terms.length === 0) {
        reachedEndRef.current = true;
        setReachedEnd(true);
        return;
      }
      reachedEndRef.current = false;
      loadErrorRef.current = null;
      setReachedEnd(false);
      setLoadError(null);
      for (const term of result.terms) loadedIdsRef.current.add(term.id);
      const nextTerms = [...termsRef.current, ...result.terms];
      termsRef.current = nextTerms;
      setTerms(nextTerms);
    } finally {
      if (requestId === requestIdRef.current) {
        inFlightRef.current = false;
        setIsFetchingMore(false);
      }
    }
  }, []);

  const maybePrefetch = useCallback(() => {
    if (reachedEndRef.current || loadErrorRef.current) return;
    if (termsRef.current.length - currentIndexRef.current <= REVIEW_QUEUE_PREFETCH_REMAINING) {
      void loadMore();
    }
  }, [loadMore]);

  useMountEffect(() => {
    maybePrefetch();
  });

  const goNext = useCallback(async () => {
    if (currentIndexRef.current + 1 < termsRef.current.length) {
      const next = currentIndexRef.current + 1;
      currentIndexRef.current = next;
      setCurrentIndex(next);
      maybePrefetch();
      return next;
    }
    await loadMore();
    const next =
      currentIndexRef.current + 1 < termsRef.current.length
        ? currentIndexRef.current + 1
        : termsRef.current.length;
    currentIndexRef.current = next;
    setCurrentIndex(next);
    maybePrefetch();
    return next;
  }, [loadMore, maybePrefetch]);

  const goPrevious = useCallback(() => {
    const next = Math.max(0, currentIndexRef.current - 1);
    currentIndexRef.current = next;
    setCurrentIndex(next);
  }, []);

  const switchCollection = useCallback(
    (nextId: string) => {
      if (nextId === collectionIdRef.current) return;
      collectionIdRef.current = nextId;
      requestIdRef.current++;
      inFlightRef.current = false;

      const hasCurrent = currentIndexRef.current < termsRef.current.length;
      if (hasCurrent) {
        const trimmed = termsRef.current.slice(0, currentIndexRef.current + 1);
        termsRef.current = trimmed;
        setTerms(trimmed);
        loadedIdsRef.current = new Set(trimmed.map((term) => term.id));
      } else {
        termsRef.current = [];
        currentIndexRef.current = 0;
        setTerms([]);
        setCurrentIndex(0);
        loadedIdsRef.current = new Set();
      }

      reachedEndRef.current = false;
      loadErrorRef.current = null;
      setReachedEnd(false);
      setLoadError(null);
      void loadMore();
    },
    [loadMore],
  );

  const currentTerm = terms[currentIndex] ?? null;
  const status: ReviewQueueStatus = currentTerm
    ? "ready"
    : loadError
      ? "error"
      : reachedEnd
        ? "caughtUp"
        : "loading";

  return {
    terms,
    currentIndex,
    currentTerm,
    canGoBack: currentIndex > 0,
    status,
    errorMessage: loadError,
    isFetchingMore,
    goNext,
    goPrevious,
    switchCollection,
    retry: goNext,
  };
}
