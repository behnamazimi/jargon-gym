"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchSharedDomains } from "@/app/(private)/jargon/browse/actions";
import type { BrowseCollectionFilter, BrowseCounts, BrowsePageResult } from "@/lib/jargon/browse";

const SEARCH_DEBOUNCE_MS = 300;

type UseSharedDomainsBrowseArgs = {
  initialPage: BrowsePageResult;
};

export function useSharedDomainsBrowse({ initialPage }: UseSharedDomainsBrowseArgs) {
  const [searchInput, setSearchInput] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [filter, setFilter] = useState<BrowseCollectionFilter>("all");
  const [domains, setDomains] = useState(initialPage.domains);
  const [counts, setCounts] = useState(initialPage.counts);
  const [nextOffset, setNextOffset] = useState(initialPage.nextOffset);
  const [listError, setListError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const requestId = useRef(0);
  const inFlight = useRef(false);
  const loadMoreRef = useRef<() => void>(() => {});
  const observerRef = useRef<IntersectionObserver | null>(null);

  const applyPage = useCallback((page: BrowsePageResult, append: boolean) => {
    setCounts(page.counts);
    setNextOffset(page.nextOffset);
    setDomains((current) => (append ? [...current, ...page.domains] : page.domains));
  }, []);

  const fetchPage = useCallback(
    async (nextFilter: BrowseCollectionFilter, search: string, offset: number, append: boolean) => {
      const id = ++requestId.current;
      inFlight.current = true;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsRefreshing(true);
        setIsLoadingMore(false);
      }
      setListError(null);

      const result = await searchSharedDomains({ search, filter: nextFilter, offset });
      if (id !== requestId.current) return;

      inFlight.current = false;
      setIsLoadingMore(false);
      setIsRefreshing(false);

      if (result.error || !result.page) {
        setListError(result.error ?? "Couldn't load collections. Try again.");
        return;
      }

      applyPage(result.page, append);
    },
    [applyPage],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setCommittedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const isFirstSync = useRef(true);
  useEffect(() => {
    if (isFirstSync.current) {
      isFirstSync.current = false;
      return;
    }
    void fetchPage(filter, committedSearch, 0, false);
  }, [committedSearch, fetchPage, filter]);

  const loadMore = useCallback(() => {
    if (nextOffset === null || inFlight.current) return;
    void fetchPage(filter, committedSearch, nextOffset, true);
  }, [committedSearch, fetchPage, filter, nextOffset]);
  loadMoreRef.current = loadMore;

  const bindSentinel = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current();
      },
      { rootMargin: "320px 0px" },
    );
    observerRef.current = observer;
    observer.observe(node);
  }, []);

  function clearFilters() {
    setSearchInput("");
    setCommittedSearch("");
    setFilter("all");
  }

  function markInCollection(domainId: string, inCollection: boolean) {
    setDomains((current) => {
      const next = current.map((domain) =>
        domain.id === domainId ? { ...domain, inCollection } : domain,
      );
      if (filter === "available" && inCollection) {
        return next.filter((domain) => domain.id !== domainId);
      }
      if (filter === "in-collection" && !inCollection) {
        return next.filter((domain) => domain.id !== domainId);
      }
      return next;
    });
    setCounts((current) => adjustCounts(current, inCollection));
  }

  const matchingCount = countForFilter(counts, filter);
  const hasActiveFilters = committedSearch.length > 0 || filter !== "all";
  const isEmptyCatalog = counts.all === 0 && !hasActiveFilters && domains.length === 0;

  return {
    searchInput,
    setSearchInput,
    filter,
    setFilter,
    domains,
    counts,
    matchingCount,
    nextOffset,
    listError,
    isRefreshing,
    isLoadingMore,
    bindSentinel,
    hasActiveFilters,
    isEmptyCatalog,
    clearFilters,
    markInCollection,
    retry: () => void fetchPage(filter, committedSearch, 0, false),
  };
}

function countForFilter(counts: BrowseCounts, filter: BrowseCollectionFilter) {
  if (filter === "available") return counts.available;
  if (filter === "in-collection") return counts.inCollection;
  return counts.all;
}

function adjustCounts(counts: BrowseCounts, inCollection: boolean): BrowseCounts {
  if (inCollection) {
    return {
      all: counts.all,
      available: Math.max(0, counts.available - 1),
      inCollection: counts.inCollection + 1,
    };
  }
  return {
    all: counts.all,
    available: counts.available + 1,
    inCollection: Math.max(0, counts.inCollection - 1),
  };
}
