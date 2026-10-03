"use client";

import { useRef, useState } from "react";
import { addToCollection } from "@/app/(private)/jargon/actions";
import { searchSharedDomains } from "@/app/(private)/jargon/browse/actions";
import type { SearchState } from "@/components/import/chooser-search-results";

const SEARCH_DEBOUNCE_MS = 300;

/** Searches shared collections as you type and adds one with a tap. The timer
 *  and the request counter live in refs, so a slow answer never overwrites a newer one. */
export function useBrowseSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const requestId = useRef(0);

  function handleQuery(value: string) {
    setQuery(value);
    window.clearTimeout(timer.current);
    const trimmed = value.trim();
    const id = ++requestId.current;

    if (!trimmed) {
      setSearch({ status: "idle" });
      return;
    }

    setSearch({ status: "loading" });
    timer.current = window.setTimeout(async () => {
      const result = await searchSharedDomains({ search: trimmed, filter: "all", offset: 0 });
      if (id !== requestId.current) return;
      setSearch(
        result.page
          ? { status: "done", query: trimmed, domains: result.page.domains }
          : { status: "error" },
      );
    }, SEARCH_DEBOUNCE_MS);
  }

  async function add(domainId: string) {
    setAddingId(domainId);
    const result = await addToCollection(domainId);
    setAddingId(null);
    if (result.error) {
      setSearch({ status: "error" });
      return;
    }
    setAddedIds((current) => [...current, domainId]);
  }

  return { query, search, addingId, addedIds, handleQuery, add };
}
