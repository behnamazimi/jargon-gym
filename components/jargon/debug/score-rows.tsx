"use client";

import { useEffect, useMemo, useState } from "react";
import type { DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
import { ScoreRow } from "./score-row";
import { ScoreRowsToolbar } from "./score-rows-toolbar";
import { filterAndSort, type SortOption } from "./score-rows-sort";

/** Debug intentionally shows every scored candidate, unsliced — but
 *  mounting hundreds of these rows (each with badges + formatted detail
 *  text) in one synchronous commit can block the main thread long enough to
 *  feel like the page froze, especially on a client-side transition where
 *  there's no browser loading indicator to signal it's still working.
 *  Rendering in batches keeps each commit small while still surfacing the
 *  full list. */
const BATCH_SIZE = 100;

export function ScoreRows({ rows }: { rows: DebugScoredRow[] }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rank");
  const filteredRows = useMemo(() => filterAndSort(rows, query, sortBy), [rows, query, sortBy]);

  const [visibleCount, setVisibleCount] = useState(Math.min(BATCH_SIZE, filteredRows.length));

  // A new filter selection (context/collection), search query, or sort swaps
  // in a fresh row order — reset back to the first batch instead of carrying
  // over a stale count.
  useEffect(() => {
    setVisibleCount(Math.min(BATCH_SIZE, filteredRows.length));
  }, [filteredRows]);

  if (rows.length === 0) {
    return <p className="m-0 text-sm text-base-content/60">No terms match this selection.</p>;
  }

  const visibleRows = filteredRows.slice(0, visibleCount);
  const remaining = filteredRows.length - visibleRows.length;

  return (
    <>
      <ScoreRowsToolbar
        query={query}
        onQueryChange={setQuery}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {filteredRows.length === 0 ? (
        <p className="m-0 text-sm text-base-content/60">No terms match “{query}”.</p>
      ) : (
        <>
          <ul className="m-0 list-none divide-y divide-base-content/10 p-0">
            {visibleRows.map((row, index) => (
              <ScoreRow key={row.termId} row={row} index={index} />
            ))}
          </ul>
          {remaining > 0 ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm mt-3"
              onClick={() =>
                setVisibleCount((count) => Math.min(count + BATCH_SIZE, filteredRows.length))
              }
            >
              Show {Math.min(remaining, BATCH_SIZE)} more ({remaining} left)
            </button>
          ) : null}
        </>
      )}
    </>
  );
}
