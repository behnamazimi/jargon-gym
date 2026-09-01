"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { recordTermReadAction } from "@/app/(private)/jargon/actions";
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
  const countedShownRef = useRef(new Set<string>());
  const openTermsRef = useRef(openTerms);
  openTermsRef.current = openTerms;

  // Sync knownTerms when initialData changes (e.g., after router.refresh())
  useEffect(() => {
    setKnownTerms(new Set(initialData.knownTermIds));
  }, [initialData.knownTermIds]);

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
    toggleCategory,
    toggleOpen,
    clearSearch,
  };
}
