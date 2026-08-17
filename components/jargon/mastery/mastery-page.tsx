"use client";

import { useMemo, useRef, useState } from "react";
import type { OverallStrength } from "@/lib/smart-queue";
import type { WebStatsSnapshot } from "@/lib/jargon/collection-stats";
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
import { MasteryOverview } from "./mastery-overview";
import { MasteryRow } from "./mastery-row";

type BucketFilter = OverallStrength | "all";

const STRENGTH_OPTIONS: Array<{ value: OverallStrength; label: string }> = [
  { value: "unverified", label: "Unverified" },
  { value: "weak", label: "Weak" },
  { value: "medium", label: "Medium" },
  { value: "strong", label: "Strong" },
];

const BUCKET_OPTIONS: Array<{ value: BucketFilter; label: string }> = [
  { value: "all", label: "All" },
  ...STRENGTH_OPTIONS,
];

function bucketChipClass(selected: boolean) {
  return cn(
    "h-7 min-h-7 rounded-lg px-3 py-0 text-xs font-normal",
    selected
      ? "border-primary bg-primary/10 text-primary hover:bg-primary/15 data-selected:border-primary data-selected:bg-primary/10 data-selected:text-primary"
      : "border-base-300/80 text-base-content hover:bg-base-200/60",
  );
}

/** Strongest first — bucket rank, then score within a bucket. */
const BUCKET_RANK: Record<OverallStrength, number> = {
  strong: 3,
  medium: 2,
  weak: 1,
  unverified: 0,
};

function sortRows(rows: MasteryRowData[]): MasteryRowData[] {
  return [...rows].sort((a, b) => {
    const bucketDiff = BUCKET_RANK[b.bucket] - BUCKET_RANK[a.bucket];
    if (bucketDiff !== 0) return bucketDiff;
    if (a.score !== b.score) return b.score - a.score;
    return a.term.localeCompare(b.term);
  });
}

type MasteryPageProps = {
  rows: MasteryRowData[];
  collections: MasteryCollectionOption[];
  stats: WebStatsSnapshot;
};

export function MasteryPage({ rows, collections, stats }: MasteryPageProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionId, setCollectionId] = useState<string>("all");
  const [bucket, setBucket] = useState<BucketFilter>("all");

  /** Rows scoped by search + collection, but not by bucket — this is what the
   *  bucket chip counts are drawn from, so a chip shows how many terms it
   *  would reveal from here, not how many exist overall. */
  const scopedRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (collectionId !== "all" && row.domainId !== collectionId) return false;
      if (query && !row.term.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [rows, collectionId, searchQuery]);

  const bucketCounts = useMemo(() => {
    const counts: Record<BucketFilter, number> = {
      all: scopedRows.length,
      unverified: 0,
      weak: 0,
      medium: 0,
      strong: 0,
    };
    for (const row of scopedRows) counts[row.bucket]++;
    return counts;
  }, [scopedRows]);

  const filteredRows = useMemo(() => {
    const filtered =
      bucket === "all" ? scopedRows : scopedRows.filter((row) => row.bucket === bucket);
    return sortRows(filtered);
  }, [scopedRows, bucket]);

  return (
    <div className="space-y-5">
      <MasteryOverview stats={stats} />

      {collections.length > 0 ? (
        <>
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
                    <span
                      className={cn(
                        "tabular-nums",
                        selected ? "text-primary/70" : "text-base-content/40",
                      )}
                    >
                      {bucketCounts[option.value]}
                    </span>
                  </Toggle>
                );
              })}
            </div>

            <p className="text-xs text-base-content/60">
              {filteredRows.length} of {scopedRows.length} shown
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
        </>
      ) : (
        <p className="text-sm text-base-content/60">
          All collections are paused. Turn one on in the app to start reviewing.
        </p>
      )}
    </div>
  );
}
