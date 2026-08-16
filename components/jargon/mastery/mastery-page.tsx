"use client";

import { useMemo, useRef, useState } from "react";
import type { OverallStrength } from "@/lib/smart-queue";
import type { MasteryCollectionOption, MasteryRow as MasteryRowData } from "@/lib/jargon/mastery";
import { SearchBar } from "@/components/jargon/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { MasteryRow } from "./mastery-row";

type BucketFilter = OverallStrength | "all";

const BUCKET_OPTIONS: Array<{ value: BucketFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unverified", label: "Unverified" },
  { value: "weak", label: "Weak" },
  { value: "medium", label: "Medium" },
  { value: "strong", label: "Strong" },
];

function bucketChipClass(selected: boolean) {
  return cn(
    "h-7 min-h-7 rounded-lg px-3 py-0 text-xs font-normal",
    selected
      ? "border-primary bg-primary/10 text-primary hover:bg-primary/15 data-selected:border-primary data-selected:bg-primary/10 data-selected:text-primary"
      : "border-base-300/80 text-base-content hover:bg-base-200/60",
  );
}

/** Strongest first. */
function sortRows(rows: MasteryRowData[]): MasteryRowData[] {
  return [...rows].sort((a, b) => {
    if (a.bars !== b.bars) return b.bars - a.bars;
    if (a.score !== b.score) return b.score - a.score;
    return a.term.localeCompare(b.term);
  });
}

type MasteryPageProps = {
  rows: MasteryRowData[];
  collections: MasteryCollectionOption[];
};

export function MasteryPage({ rows, collections }: MasteryPageProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionId, setCollectionId] = useState<string>("all");
  const [bucket, setBucket] = useState<BucketFilter>("all");

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (collectionId !== "all" && row.domainId !== collectionId) return false;
      if (bucket !== "all" && row.bucket !== bucket) return false;
      if (query && !row.term.toLowerCase().includes(query)) return false;
      return true;
    });
    return sortRows(filtered);
  }, [rows, collectionId, bucket, searchQuery]);

  return (
    <div className="space-y-5">
      <section
        aria-label="Filter mastery overview"
        className="shadow-surface space-y-3 rounded-2xl bg-base-100 p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery("")}
              inputRef={searchInputRef}
            />
          </div>
          <Select
            value={collectionId}
            onChange={(value) => setCollectionId(value as string)}
            aria-label="Filter by collection"
          >
            <SelectTrigger size="sm" className="rounded-lg text-xs sm:w-48">
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

        <div className="flex flex-wrap gap-1.5">
          {BUCKET_OPTIONS.map((option) => {
            const selected = bucket === option.value;
            return (
              <Toggle
                key={option.value}
                size="sm"
                isSelected={selected}
                onChange={() => setBucket(option.value)}
                aria-label={`Filter by ${option.label}`}
                className={bucketChipClass(selected)}
              >
                {option.label}
              </Toggle>
            );
          })}
        </div>

        <p className="text-xs text-base-content/60">
          {filteredRows.length} of {rows.length} shown
        </p>
      </section>

      {filteredRows.length === 0 ? (
        <div className="shadow-surface rounded-2xl bg-base-100 px-6 py-12 text-center">
          <p className="text-sm text-base-content/60">No terms match your filters.</p>
        </div>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {filteredRows.map((row) => (
            <MasteryRow key={row.termId} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
