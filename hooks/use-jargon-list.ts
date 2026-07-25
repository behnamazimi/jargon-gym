"use client";

import { useCallback, useMemo, useState } from "react";
import { DUMMY_TERMS, INITIAL_KNOWN_TERMS } from "@/lib/jargon/dummy-data";
import { filterTerms, getCategories, getCategoryCounts } from "@/lib/jargon/filter-terms";
import type { SortMode } from "@/lib/jargon/types";

export function useJargonList() {
  const terms = DUMMY_TERMS;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [hideKnown, setHideKnown] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [openTerms, setOpenTerms] = useState<Set<string>>(new Set());
  const [knownTerms, setKnownTerms] = useState<Set<string>>(new Set(INITIAL_KNOWN_TERMS));

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

  const toggleOpen = useCallback((termName: string) => {
    setOpenTerms((prev) => {
      const next = new Set(prev);
      if (next.has(termName)) next.delete(termName);
      else next.add(termName);
      return next;
    });
  }, []);

  const toggleKnown = useCallback((termName: string) => {
    setKnownTerms((prev) => {
      const next = new Set(prev);
      if (next.has(termName)) next.delete(termName);
      else next.add(termName);
      return next;
    });
  }, []);

  const clearSearch = useCallback(() => setSearchQuery(""), []);

  return {
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
