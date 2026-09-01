"use client";

import { useMemo, useRef, useState } from "react";
import type { MasteryTermRow as MasteryTermRowData, MasteryTier } from "@/lib/jargon/mastery";
import { SearchBar } from "@/components/jargon/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MasteryTermRow } from "./mastery-term-row";
import { MasteryTierChips, type MasteryTierFilter } from "./mastery-tier-chips";

type MasteryTermListProps = {
  termRows: MasteryTermRowData[];
  collections: { id: string; name: string }[];
};

function tierCounts(rows: MasteryTermRowData[]): Record<MasteryTier, number> {
  const counts: Record<MasteryTier, number> = { weak: 0, medium: 0, strong: 0 };
  for (const row of rows) counts[row.tier] += 1;
  return counts;
}

export function MasteryTermList({ termRows, collections }: MasteryTermListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionId, setCollectionId] = useState("all");
  const [activeTier, setActiveTier] = useState<MasteryTierFilter>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const collectionFiltered = useMemo(
    () =>
      collectionId === "all" ? termRows : termRows.filter((row) => row.domainId === collectionId),
    [termRows, collectionId],
  );

  const counts = useMemo(() => tierCounts(collectionFiltered), [collectionFiltered]);

  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return collectionFiltered.filter((row) => {
      if (activeTier !== "all" && row.tier !== activeTier) return false;
      if (query && !row.term.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [collectionFiltered, activeTier, searchQuery]);

  if (termRows.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="shadow-surface space-y-3 rounded-2xl bg-base-100 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery("")}
              inputRef={searchInputRef}
            />
          </div>
          <Select value={collectionId} onChange={(key) => setCollectionId(String(key))}>
            <SelectTrigger size="sm" className="text-sm sm:w-56" aria-label="Collection">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem id="all">All collections</SelectItem>
              {collections.map((collection) => (
                <SelectItem key={collection.id} id={collection.id}>
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <MasteryTierChips
          counts={counts}
          totalCount={collectionFiltered.length}
          activeTier={activeTier}
          onChange={setActiveTier}
        />

        <p className="m-0 text-xs text-base-content/50">
          {visibleRows.length} of {collectionFiltered.length} shown
        </p>
      </div>

      {visibleRows.length > 0 ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {visibleRows.map((row) => (
            <MasteryTermRow key={row.termId} row={row} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-base-content/60">No terms match your filters.</p>
      )}
    </div>
  );
}
