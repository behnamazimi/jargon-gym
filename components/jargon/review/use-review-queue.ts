"use client";

import { useCallback, useRef, useState } from "react";
import {
  getReviewFeedBatchAction,
  type ReviewQueueSeed,
} from "@/app/(private)/jargon/review/actions";
import { REVIEW_QUEUE_PREFETCH_REMAINING } from "@/lib/review/queue";
import type { ReviewTerm } from "@/lib/review/types";
import { useMountEffect } from "@/hooks/use-mount-effect";

type ReviewQueueStatus = "ready" | "caughtUp" | "error" | "loading";

type UseReviewQueueArgs = {
  domainId: string;
  seed: ReviewQueueSeed;
};

export function useReviewQueue({ domainId, seed }: UseReviewQueueArgs) {
  const [terms, setTerms] = useState<ReviewTerm[]>(seed.terms);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(seed.caughtUp ?? false);
  const [loadError, setLoadError] = useState<string | null>(seed.error ?? null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const termsRef = useRef(terms);
  const currentIndexRef = useRef(currentIndex);
  const domainIdRef = useRef(domainId);
  const reachedEndRef = useRef(reachedEnd);
  const loadErrorRef = useRef(loadError);
  termsRef.current = terms;
  currentIndexRef.current = currentIndex;
  domainIdRef.current = domainId;
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
      const result = await getReviewFeedBatchAction(domainIdRef.current, [...loadedIdsRef.current]);
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

  const switchDomain = useCallback(
    (nextId: string) => {
      if (nextId === domainIdRef.current) return;
      domainIdRef.current = nextId;
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
    switchDomain,
    retry: goNext,
  };
}
