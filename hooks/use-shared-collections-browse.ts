"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchSharedCollections } from "@/app/(private)/app/browse/actions";
import type {
  BrowseCollectionFilter,
  BrowseCounts,
  BrowseGroup,
  BrowsePageResult,
  BrowseSort,
} from "@/lib/library/browse";

const SEARCH_DEBOUNCE_MS = 300;

type UseSharedCollectionsBrowseArgs = {
  initialPage: BrowsePageResult;
  initialGroup: BrowseGroup;
};

export function useSharedCollectionsBrowse({
  initialPage,
  initialGroup,
}: UseSharedCollectionsBrowseArgs) {
  const [searchInput, setSearchInput] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [filter, setFilter] = useState<BrowseCollectionFilter>("all");
  const [sort, setSort] = useState<BrowseSort>("name");
  const [group, setGroupState] = useState<BrowseGroup>(initialGroup);
  const [collections, setCollections] = useState(initialPage.collections);
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
    setCollections((current) => (append ? [...current, ...page.collections] : page.collections));
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

      const result = await searchSharedCollections({
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

  function markInCollection(collectionId: string, inCollection: boolean) {
    setCollections((current) => {
      const next = current.map((collection) =>
        collection.id === collectionId ? { ...collection, inCollection } : collection,
      );
      if (filter === "available" && inCollection) {
        return next.filter((collection) => collection.id !== collectionId);
      }
      if (filter === "in-collection" && !inCollection) {
        return next.filter((collection) => collection.id !== collectionId);
      }
      return next;
    });
    setCounts((current) => adjustCounts(current, inCollection));
  }

  function markLoved(collectionId: string, lovedByMe: boolean, loveCount?: number) {
    setCollections((current) =>
      current.map((collection) =>
        collection.id === collectionId
          ? {
              ...collection,
              lovedByMe,
              loveCount: loveCount ?? Math.max(0, collection.loveCount + (lovedByMe ? 1 : -1)),
            }
          : collection,
      ),
    );
  }

  function markReported(collectionId: string) {
    setCollections((current) =>
      current.map((collection) =>
        collection.id === collectionId ? { ...collection, reportedByMe: true } : collection,
      ),
    );
  }

  const matchingCount = countForFilter(counts, filter);
  const hasActiveFilters = committedSearch.length > 0 || filter !== "all" || sort !== "name";
  const isEmptyCatalog =
    counts.groups.builtin + counts.groups.community === 0 &&
    !hasActiveFilters &&
    collections.length === 0;

  return {
    searchInput,
    setSearchInput,
    filter,
    setFilter,
    sort,
    setSort,
    group,
    setGroup,
    collections,
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
