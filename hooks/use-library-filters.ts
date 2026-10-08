"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  decodeLibraryFilters,
  loadLibraryFiltersSnapshot,
  subscribeLibraryFilters,
  updateLibraryFilters,
} from "@/lib/library/library-filters";
import type { SortMode } from "@/lib/terms/types";

/** Library filter choices, remembered on this device in a cookie. The server
 *  reads the same cookie (`serverSnapshot`), so the first render already
 *  matches what the browser will show. */
export function useLibraryFilters(
  collectionId: string,
  categories: string[],
  serverSnapshot: string,
) {
  const snapshot = useSyncExternalStore(
    subscribeLibraryFilters,
    loadLibraryFiltersSnapshot,
    () => serverSnapshot,
  );
  const stored = useMemo(() => decodeLibraryFilters(snapshot), [snapshot]);

  // A remembered category the collection no longer has would hide every term.
  const activeCategories = useMemo(
    () =>
      new Set(
        (stored.categoriesByCollection[collectionId] ?? []).filter((c) => categories.includes(c)),
      ),
    [stored, collectionId, categories],
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
        const { [collectionId]: current = [], ...others } = prev.categoriesByCollection;
        const next =
          category === "All"
            ? []
            : current.includes(category)
              ? current.filter((c) => c !== category)
              : [...current, category];
        // Re-added last so this collection counts as the most recently used.
        return { ...prev, categoriesByCollection: { ...others, [collectionId]: next } };
      });
    },
    [collectionId],
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
