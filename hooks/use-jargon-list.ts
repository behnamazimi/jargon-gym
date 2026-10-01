"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { recordTermReadAction, setTermMarkedKnownAction } from "@/app/(private)/jargon/actions";
import { filterTerms, getCategories, getCategoryCounts } from "@/lib/jargon/filter-terms";
import {
  overrideCollectionCounts,
  overrideMarkedKnown,
  overrideRemoved,
  snapshotSeenAt,
  termOverride,
  useLibraryOverrides,
} from "@/lib/jargon/library/overrides";
import type { LibraryPageData } from "@/lib/jargon/types";
import { useLibraryFilters } from "./use-library-filters";

/**
 * One collection's list state. Terms and known marks come from the server
 * snapshot with this device's newer edits laid over it, so nothing is copied
 * into state and a fresh snapshot (after an edit elsewhere) simply wins. The
 * page remounts per collection, which resets search and open cards.
 */
export function useJargonList(data: LibraryPageData, filtersCookie: string) {
  const overrides = useLibraryOverrides();
  const seenAt = snapshotSeenAt(`${data.domain.id}:${data.loadedAt}`);
  // Marks still on their way to the server. They show at once and are
  // undone if the save fails.
  const [pendingMarks, setPendingMarks] = useState<ReadonlyMap<string, boolean>>(new Map());

  const terms = useMemo(
    () => data.terms.filter((term) => !termOverride(overrides, term.id, seenAt)?.removed),
    [data.terms, overrides, seenAt],
  );

  const knownTerms = useMemo(() => new Set(data.knownTermIds), [data.knownTermIds]);
  const everMasteredTerms = useMemo(
    () => new Set(data.everMasteredTermIds),
    [data.everMasteredTermIds],
  );
  const markedKnownTerms = useMemo(() => {
    const marked = new Set(data.markedKnownTermIds);
    for (const term of data.terms) {
      const local = pendingMarks.get(term.id) ?? termOverride(overrides, term.id, seenAt)?.marked;
      if (local === true) marked.add(term.id);
      if (local === false) marked.delete(term.id);
    }
    return marked;
  }, [data.markedKnownTermIds, data.terms, pendingMarks, overrides, seenAt]);

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

  // Read in event handlers only, so the callbacks below stay stable.
  const latest = useRef({
    terms,
    markedKnownTerms,
    knownTerms,
    everMasteredTerms,
    domain: data.domain,
  });
  latest.current = { terms, markedKnownTerms, knownTerms, everMasteredTerms, domain: data.domain };

  /** Tells the sidebar this collection's counts after a local change. */
  const publishCounts = useCallback((termIds: string[], marked: ReadonlySet<string>) => {
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
    });
  }, []);

  /** Resolves true once the change is saved, false if it was rolled back. */
  const toggleMarkedKnown = useCallback(
    async (termId: string): Promise<boolean> => {
      const marked = !latest.current.markedKnownTerms.has(termId);
      setPendingMarks((prev) => new Map(prev).set(termId, marked));

      const { error } = await setTermMarkedKnownAction(termId, marked);
      if (!error) {
        overrideMarkedKnown(termId, marked);
        const next = new Set(latest.current.markedKnownTerms);
        if (marked) next.add(termId);
        else next.delete(termId);
        publishCounts(
          latest.current.terms.map((term) => term.id),
          next,
        );
      }
      setPendingMarks((prev) => {
        const next = new Map(prev);
        next.delete(termId);
        return next;
      });
      return !error;
    },
    [publishCounts],
  );

  const removeTermLocally = useCallback(
    (termId: string) => {
      overrideRemoved(termId, true);
      publishCounts(
        latest.current.terms.flatMap((term) => (term.id === termId ? [] : [term.id])),
        latest.current.markedKnownTerms,
      );
    },
    [publishCounts],
  );

  const restoreTermLocally = useCallback(
    (termId: string) => {
      overrideRemoved(termId, false);
      publishCounts(
        [...latest.current.terms.map((term) => term.id), termId],
        latest.current.markedKnownTerms,
      );
    },
    [publishCounts],
  );

  return {
    domain: data.domain,
    terms,
    removeTermLocally,
    restoreTermLocally,
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
