"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { recordTermReadAction, setTermMarkedKnownAction } from "@/app/(private)/jargon/actions";
import { filterTerms, getCategories, getCategoryCounts } from "@/lib/jargon/filter-terms";
import type { JargonPageData, SortMode } from "@/lib/jargon/types";

export function useJargonList(initialData: JargonPageData) {
  const terms = initialData.terms;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [hideKnown, setHideKnown] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [openTerms, setOpenTerms] = useState<Set<string>>(new Set());
  const [knownTerms, setKnownTerms] = useState<Set<string>>(
    () => new Set(initialData.knownTermIds),
  );
  const [markedKnownTerms, setMarkedKnownTerms] = useState<Set<string>>(
    () => new Set(initialData.markedKnownTermIds),
  );
  const countedShownRef = useRef(new Set<string>());
  const openTermsRef = useRef(openTerms);
  openTermsRef.current = openTerms;
  const markedKnownTermsRef = useRef(markedKnownTerms);
  markedKnownTermsRef.current = markedKnownTerms;

  // Sync knownTerms when initialData changes (e.g., after router.refresh())
  useEffect(() => {
    setKnownTerms(new Set(initialData.knownTermIds));
  }, [initialData.knownTermIds]);

  // Sync markedKnownTerms the same way, plus optimistically right after a
  // toggle succeeds (see setTermMarkedKnown below) so the UI updates before
  // the next router.refresh() lands.
  useEffect(() => {
    setMarkedKnownTerms(new Set(initialData.markedKnownTermIds));
  }, [initialData.markedKnownTermIds]);

  const categories = useMemo(() => getCategories(terms), [terms]);
  const categoryCounts = useMemo(() => getCategoryCounts(terms), [terms]);

  const filteredTerms = useMemo(
    () =>
      filterTerms(terms, {
        searchQuery,
        activeCategories,
        hideKnown,
        sortMode,
        knownTerms,
      }),
    [terms, searchQuery, activeCategories, hideKnown, sortMode, knownTerms],
  );

  const toggleCategory = useCallback((cat: string) => {
    setActiveCategories((prev) => {
      if (cat === "All") return new Set();
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const recordReadOnce = useCallback((termId: string) => {
    if (countedShownRef.current.has(termId)) return;
    countedShownRef.current.add(termId);
    void recordTermReadAction(termId);
  }, []);

  const toggleOpen = useCallback(
    (termId: string) => {
      const wasOpen = openTermsRef.current.has(termId);

      setOpenTerms((prev) => {
        const next = new Set(prev);
        if (wasOpen) next.delete(termId);
        else next.add(termId);
        return next;
      });

      if (!wasOpen) recordReadOnce(termId);
    },
    [recordReadOnce],
  );

  const clearSearch = useCallback(() => setSearchQuery(""), []);

  const toggleMarkedKnown = useCallback(async (termId: string) => {
    const wasMarked = markedKnownTermsRef.current.has(termId);
    const marked = !wasMarked;

    // Optimistic: flip immediately, no confirmation step.
    setMarkedKnownTerms((prev) => {
      const next = new Set(prev);
      if (marked) next.add(termId);
      else next.delete(termId);
      return next;
    });

    const { error } = await setTermMarkedKnownAction(termId, marked);
    if (error) {
      // Roll back on failure.
      setMarkedKnownTerms((prev) => {
        const next = new Set(prev);
        if (marked) next.delete(termId);
        else next.add(termId);
        return next;
      });
    }
  }, []);

  return {
    domain: initialData.domain,
    domains: initialData.domains,
    terms,
    categories,
    categoryCounts,
    filteredTerms,
    searchQuery,
    setSearchQuery,
    activeCategories,
    hideKnown,
    setHideKnown,
    sortMode,
    setSortMode,
    openTerms,
    knownTerms,
    markedKnownTerms,
    toggleCategory,
    toggleOpen,
    toggleMarkedKnown,
    clearSearch,
  };
}
