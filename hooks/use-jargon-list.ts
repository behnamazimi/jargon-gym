"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { recordTermReadAction, setTermKnown } from "@/app/(private)/jargon/actions";
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
      const wasOpen = openTerms.has(termId);

      setOpenTerms((prev) => {
        const next = new Set(prev);
        if (wasOpen) next.delete(termId);
        else next.add(termId);
        return next;
      });

      if (!wasOpen) recordReadOnce(termId);
    },
    [openTerms, recordReadOnce],
  );

  const toggleKnown = useCallback(
    async (termId: string) => {
      const wasKnown = knownTerms.has(termId);
      const nextIsKnown = !wasKnown;

      setKnownTerms((prev) => {
        const next = new Set(prev);
        if (wasKnown) next.delete(termId);
        else next.add(termId);
        return next;
      });

      const result = await setTermKnown(termId, nextIsKnown);
      if (result.error) {
        setKnownTerms((prev) => {
          const next = new Set(prev);
          if (wasKnown) next.add(termId);
          else next.delete(termId);
          return next;
        });
      }
    },
    [knownTerms],
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
    toggleKnown,
    clearSearch,
  };
}
