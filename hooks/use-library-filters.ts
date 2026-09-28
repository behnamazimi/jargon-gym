"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  loadLibraryFiltersSnapshot,
  parseLibraryFilters,
  subscribeLibraryFilters,
  updateLibraryFilters,
} from "@/lib/jargon/library-filters";
import type { SortMode } from "@/lib/jargon/types";

/** Library filter choices, remembered on this device. The server render
 *  uses the defaults; the stored choices apply right after hydration. */
export function useLibraryFilters(domainId: string, categories: string[]) {
  const snapshot = useSyncExternalStore(
    subscribeLibraryFilters,
    loadLibraryFiltersSnapshot,
    () => "",
  );
  const stored = useMemo(() => parseLibraryFilters(snapshot), [snapshot]);

  // A remembered category the collection no longer has would hide every term.
  const activeCategories = useMemo(
    () =>
      new Set((stored.categoriesByDomain[domainId] ?? []).filter((c) => categories.includes(c))),
    [stored, domainId, categories],
  );

  const setHideKnown = useCallback((hideKnown: boolean) => {
    updateLibraryFilters((prev) => ({ ...prev, hideKnown }));
  }, []);

  const setSortMode = useCallback((sortMode: SortMode) => {
    updateLibraryFilters((prev) => ({ ...prev, sortMode }));
  }, []);

  const toggleCategory = useCallback(
    (category: string) => {
      updateLibraryFilters((prev) => {
        const current = prev.categoriesByDomain[domainId] ?? [];
        const next =
          category === "All"
            ? []
            : current.includes(category)
              ? current.filter((c) => c !== category)
              : [...current, category];
        return { ...prev, categoriesByDomain: { ...prev.categoriesByDomain, [domainId]: next } };
      });
    },
    [domainId],
  );

  return {
    hideKnown: stored.hideKnown,
    setHideKnown,
    sortMode: stored.sortMode,
    setSortMode,
    activeCategories,
    toggleCategory,
  };
}
