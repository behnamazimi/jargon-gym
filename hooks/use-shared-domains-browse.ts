"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchSharedDomains } from "@/app/(private)/app/browse/actions";
import type {
  BrowseCollectionFilter,
  BrowseCounts,
  BrowseGroup,
  BrowsePageResult,
  BrowseSort,
} from "@/lib/library/browse";

const SEARCH_DEBOUNCE_MS = 300;

type UseSharedDomainsBrowseArgs = {
  initialPage: BrowsePageResult;
  initialGroup: BrowseGroup;
};

export function useSharedDomainsBrowse({ initialPage, initialGroup }: UseSharedDomainsBrowseArgs) {
  const [searchInput, setSearchInput] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [filter, setFilter] = useState<BrowseCollectionFilter>("all");
  const [sort, setSort] = useState<BrowseSort>("name");
  const [group, setGroupState] = useState<BrowseGroup>(initialGroup);
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
    async (
      nextFilter: BrowseCollectionFilter,
      nextGroup: BrowseGroup,
      nextSort: BrowseSort,
      search: string,
      offset: number,
      append: boolean,
    ) => {
      const id = ++requestId.current;
      inFlight.current = true;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsRefreshing(true);
        setIsLoadingMore(false);
      }
      setListError(null);

      const result = await searchSharedDomains({
        search,
        filter: nextFilter,
        group: nextGroup,
        sort: nextSort,
        offset,
      });
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
    void fetchPage(filter, group, sort, committedSearch, 0, false);
  }, [committedSearch, fetchPage, filter, group, sort]);

  const loadMore = useCallback(() => {
    if (nextOffset === null || inFlight.current) return;
    void fetchPage(filter, group, sort, committedSearch, nextOffset, true);
  }, [committedSearch, fetchPage, filter, group, nextOffset, sort]);
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

  function setGroup(next: BrowseGroup) {
    if (next === group) return;
    setGroupState(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  }

  function clearFilters() {
    setSearchInput("");
    setCommittedSearch("");
    setFilter("all");
    setSort("name");
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

  function markLoved(domainId: string, lovedByMe: boolean, loveCount?: number) {
    setDomains((current) =>
      current.map((domain) =>
        domain.id === domainId
          ? {
              ...domain,
              lovedByMe,
              loveCount: loveCount ?? Math.max(0, domain.loveCount + (lovedByMe ? 1 : -1)),
            }
          : domain,
      ),
    );
  }

  function markReported(domainId: string) {
    setDomains((current) =>
      current.map((domain) =>
        domain.id === domainId ? { ...domain, reportedByMe: true } : domain,
      ),
    );
  }

  const matchingCount = countForFilter(counts, filter);
  const hasActiveFilters = committedSearch.length > 0 || filter !== "all" || sort !== "name";
  const isEmptyCatalog =
    counts.groups.builtin + counts.groups.community === 0 &&
    !hasActiveFilters &&
    domains.length === 0;

  return {
    searchInput,
    setSearchInput,
    filter,
    setFilter,
    sort,
    setSort,
    group,
    setGroup,
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
    markLoved,
    markReported,
    retry: () => void fetchPage(filter, group, sort, committedSearch, 0, false),
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
      ...counts,
      available: Math.max(0, counts.available - 1),
      inCollection: counts.inCollection + 1,
    };
  }
  return {
    ...counts,
    available: counts.available + 1,
    inCollection: Math.max(0, counts.inCollection - 1),
  };
}
