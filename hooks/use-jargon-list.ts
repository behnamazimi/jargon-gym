"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  deleteTerm,
  recordTermReadAction,
  setTermMarkedKnownAction,
} from "@/app/(private)/jargon/actions";
import { filterTerms, getCategories, getCategoryCounts } from "@/lib/library/filter-terms";
import {
  overrideCollectionCounts,
  overrideMarkedKnown,
  overrideRemoved,
  termOverride,
  useLibraryOverrides,
} from "@/lib/library/overrides";
import type { LibraryPageData } from "@/lib/terms/types";
import { useLibraryFilters } from "./use-library-filters";

type PendingMark = { marked: boolean; tap: number };

/** Numbers each tap, so an earlier tap finishing doesn't clear a later one. */
let lastTap = 0;

async function settle<T extends { error?: string; savedAt?: number }>(
  action: Promise<T>,
): Promise<T | { error: string; savedAt?: undefined }> {
  try {
    return await action;
  } catch {
    return { error: "Couldn't save that. Check your connection and try again." };
  }
}

/**
 * One collection's list state. Terms and known marks come from the server
 * snapshot with this device's edits laid over it (see overrides.ts), so
 * nothing is copied into state and a newer snapshot simply wins. The page
 * remounts per collection, which resets search and open cards.
 */
export function useJargonList(data: LibraryPageData, filtersCookie: string) {
  const overrides = useLibraryOverrides();
  // Edits still on their way to the server. They show at once and are
  // undone if the save fails.
  const [pendingMarks, setPendingMarks] = useState<ReadonlyMap<string, PendingMark>>(new Map());
  const [pendingRemovals, setPendingRemovals] = useState<ReadonlySet<string>>(new Set());

  const terms = useMemo(
    () =>
      data.terms.filter(
        (term) =>
          !pendingRemovals.has(term.id) &&
          !termOverride(overrides, term.id, data.loadedAt)?.removed,
      ),
    [data.terms, data.loadedAt, overrides, pendingRemovals],
  );

  const knownTerms = useMemo(() => new Set(data.knownTermIds), [data.knownTermIds]);
  const everMasteredTerms = useMemo(
    () => new Set(data.everMasteredTermIds),
    [data.everMasteredTermIds],
  );
  const markedKnownTerms = useMemo(() => {
    const marked = new Set(data.markedKnownTermIds);
    for (const term of data.terms) {
      const local =
        pendingMarks.get(term.id)?.marked ??
        termOverride(overrides, term.id, data.loadedAt)?.marked;
      if (local === true) marked.add(term.id);
      if (local === false) marked.delete(term.id);
    }
    return marked;
  }, [data.markedKnownTermIds, data.terms, data.loadedAt, pendingMarks, overrides]);

  const [searchQuery, setSearchQuery] = useState("");
  const [openTerms, setOpenTerms] = useState<ReadonlySet<string>>(new Set());
  const countedShownRef = useRef(new Set<string>());

  const categories = useMemo(() => getCategories(terms), [terms]);
  const categoryCounts = useMemo(() => getCategoryCounts(terms), [terms]);
  const { hideKnown, setHideKnown, sortMode, setSortMode, activeCategories, toggleCategory } =
    useLibraryFilters(data.domain.id, categories, filtersCookie);

  const filteredTerms = useMemo(
    () =>
      filterTerms(terms, {
        searchQuery,
        activeCategories,
        hideKnown,
        sortMode,
        knownTerms,
        markedKnownTerms,
      }),
    [terms, searchQuery, activeCategories, hideKnown, sortMode, knownTerms, markedKnownTerms],
  );

  const toggleOpen = useCallback((termId: string) => {
    setOpenTerms((prev) => {
      const next = new Set(prev);
      if (next.has(termId)) next.delete(termId);
      else next.add(termId);
      return next;
    });
    if (countedShownRef.current.has(termId)) return;
    countedShownRef.current.add(termId);
    void recordTermReadAction(termId);
  }, []);

  const clearSearch = useCallback(() => setSearchQuery(""), []);

  // Read in event handlers only, so the callbacks below stay stable for the
  // memoized rows.
  const latest = useRef({
    terms,
    markedKnownTerms,
    knownTerms,
    everMasteredTerms,
    domain: data.domain,
  });
  latest.current = { terms, markedKnownTerms, knownTerms, everMasteredTerms, domain: data.domain };

  /** Tells the sidebar this collection's counts after a saved change. */
  const publishCounts = useCallback(
    (termIds: string[], marked: ReadonlySet<string>, savedAt: number) => {
      const { knownTerms, everMasteredTerms, domain } = latest.current;
      let knownCount = 0;
      let termsLearnedCount = 0;
      for (const id of termIds) {
        if (knownTerms.has(id) || marked.has(id)) knownCount += 1;
        if (everMasteredTerms.has(id) || marked.has(id)) termsLearnedCount += 1;
      }
      overrideCollectionCounts(domain.id, {
        termCount: termIds.length,
        knownCount,
        termsLearnedCount,
        savedAt,
      });
    },
    [],
  );

  /** Resolves true once the change is saved, false if it was rolled back. */
  const toggleMarkedKnown = useCallback(
    async (termId: string): Promise<boolean> => {
      const marked = !latest.current.markedKnownTerms.has(termId);
      const tap = ++lastTap;
      setPendingMarks((prev) => new Map(prev).set(termId, { marked, tap }));

      const { savedAt } = await settle(setTermMarkedKnownAction(termId, marked));
      if (savedAt) {
        overrideMarkedKnown(termId, marked, savedAt);
        const next = new Set(latest.current.markedKnownTerms);
        if (marked) next.add(termId);
        else next.delete(termId);
        publishCounts(
          latest.current.terms.map((term) => term.id),
          next,
          savedAt,
        );
      }
      setPendingMarks((prev) => {
        if (prev.get(termId)?.tap !== tap) return prev;
        const next = new Map(prev);
        next.delete(termId);
        return next;
      });
      return Boolean(savedAt);
    },
    [publishCounts],
  );

  /** Hides the term at once and deletes it. Resolves false (and shows it
   *  again) if the delete fails. */
  const removeTerm = useCallback(
    async (termId: string): Promise<boolean> => {
      setPendingRemovals((prev) => new Set(prev).add(termId));
      const { savedAt } = await settle(deleteTerm(termId));
      if (savedAt) {
        overrideRemoved(termId, savedAt);
        publishCounts(
          latest.current.terms.flatMap((term) => (term.id === termId ? [] : [term.id])),
          latest.current.markedKnownTerms,
          savedAt,
        );
      }
      setPendingRemovals((prev) => {
        const next = new Set(prev);
        next.delete(termId);
        return next;
      });
      return Boolean(savedAt);
    },
    [publishCounts],
  );

  return {
    domain: data.domain,
    terms,
    removeTerm,
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
    everMasteredTerms,
    toggleCategory,
    toggleOpen,
    toggleMarkedKnown,
    clearSearch,
  };
}
