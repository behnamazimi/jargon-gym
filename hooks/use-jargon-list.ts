"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { recordTermReadAction, setTermMarkedKnownAction } from "@/app/(private)/jargon/actions";
import { filterTerms, getCategories, getCategoryCounts } from "@/lib/jargon/filter-terms";
import type { JargonPageData, SortMode, Term } from "@/lib/jargon/types";

export function useJargonList(initialData: JargonPageData) {
  const [terms, setTerms] = useState(initialData.terms);

  // Sync terms when initialData changes (e.g., after router.refresh() or a
  // collection switch), same pattern as knownTerms/markedKnownTerms below.
  useEffect(() => {
    setTerms(initialData.terms);
  }, [initialData.terms]);

  const removeTermLocally = useCallback((termId: string) => {
    setTerms((prev) => prev.filter((t) => t.id !== termId));
  }, []);

  // The delete this is rolling back was scoped to whichever domain was on
  // screen when it started. If the user has since switched collections
  // (the page no longer remounts on switch — see jargon-page.tsx), `terms`
  // now belongs to a different domain, and splicing the old term back in
  // would corrupt that domain's list. Bail if the domain has moved on.
  const restoreTermLocally = useCallback((term: Term, index: number, domainId: string) => {
    if (domainId !== domainIdRef.current) return;
    setTerms((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, term);
      return next;
    });
  }, []);

  const [domains, setDomains] = useState(initialData.domains);

  // Sync domains when initialData changes (e.g., after router.refresh() or a
  // collection switch), same pattern as knownTerms/markedKnownTerms below.
  useEffect(() => {
    setDomains(initialData.domains);
  }, [initialData.domains]);

  const domain = useMemo(
    () => domains.find((d) => d.id === initialData.domain.id) ?? initialData.domain,
    [domains, initialData.domain],
  );
  const domainIdRef = useRef(domain.id);
  domainIdRef.current = domain.id;

  const setDomainActiveForReview = useCallback((domainId: string, active: boolean) => {
    setDomains((prev) =>
      prev.map((d) => (d.id === domainId ? { ...d, isActiveForReview: active } : d)),
    );
  }, []);

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
  const [everMasteredTerms, setEverMasteredTerms] = useState<Set<string>>(
    () => new Set(initialData.everMasteredTermIds),
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

  // Sync everMasteredTerms when initialData changes. Read-only/display-only:
  // no action in this hook mutates it directly.
  useEffect(() => {
    setEverMasteredTerms(new Set(initialData.everMasteredTermIds));
  }, [initialData.everMasteredTermIds]);

  // Filters and open cards are local to whichever collection is on screen —
  // switching collections should start from a clean slate instead of
  // carrying over the previous one's search/category/sort/hidden state.
  const previousDomainIdRef = useRef(initialData.domain.id);
  useEffect(() => {
    if (previousDomainIdRef.current === initialData.domain.id) return;
    previousDomainIdRef.current = initialData.domain.id;
    setSearchQuery("");
    setActiveCategories(new Set());
    setHideKnown(false);
    setSortMode("default");
    setOpenTerms(new Set());
  }, [initialData.domain.id]);

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
        markedKnownTerms,
      }),
    [terms, searchQuery, activeCategories, hideKnown, sortMode, knownTerms, markedKnownTerms],
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
    domain,
    domains,
    setDomainActiveForReview,
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
