"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { SortMode } from "@/lib/terms/types";
import type { RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CategoryChips } from "@/components/terms/category-chips";
import { SearchBar } from "@/components/shared/search-bar";
import { Toolbar } from "@/components/shared/toolbar";

type LibraryFiltersProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  categories: string[];
  categoryCounts: Record<string, number>;
  totalCount: number;
  activeCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
  hideKnown: boolean;
  onHideKnownChange: (value: boolean) => void;
  sortMode: SortMode;
  onSortChange: (value: SortMode) => void;
  visibleCount: number;
};

function countActiveFilters(activeCategories: Set<string>, hideKnown: boolean, sortMode: SortMode) {
  let count = 0;
  if (activeCategories.size > 0) count += 1;
  if (hideKnown) count += 1;
  if (sortMode !== "default") count += 1;
  return count;
}

export function LibraryFilters({
  searchQuery,
  onSearchChange,
  onSearchClear,
  searchInputRef,
  categories,
  categoryCounts,
  totalCount,
  activeCategories,
  onToggleCategory,
  hideKnown,
  onHideKnownChange,
  sortMode,
  onSortChange,
  visibleCount,
}: LibraryFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const activeFilterCount = useMemo(
    () => countActiveFilters(activeCategories, hideKnown, sortMode),
    [activeCategories, hideKnown, sortMode],
  );

  if (totalCount === 0) return null;

  return (
    <section aria-label="Filter terms" data-tour="library-search" className="space-y-3">
      <div className="flex items-stretch gap-2">
        <div className="min-w-0 flex-1">
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            onClear={onSearchClear}
            inputRef={searchInputRef}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          aria-expanded={expanded}
          aria-controls="library-advanced-filters"
          onPress={() => setExpanded((value) => !value)}
          className={cn("min-h-10 shrink-0 gap-2", expanded && "bg-base-200")}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden strokeWidth={1.5} />
          Filters
          {activeFilterCount > 0 ? (
            <Badge
              variant="default"
              className={cn("min-w-5 px-1.5 py-0 text-xs tabular-nums", expanded && "invisible")}
            >
              {activeFilterCount}
            </Badge>
          ) : null}
        </Button>
      </div>

      {expanded ? (
        <div
          id="library-advanced-filters"
          className="shadow-surface space-y-3 rounded-box bg-base-100 p-4"
        >
          <CategoryChips
            categories={categories}
            counts={categoryCounts}
            totalCount={totalCount}
            activeCategories={activeCategories}
            onToggle={onToggleCategory}
          />
          <Toolbar
            hideKnown={hideKnown}
            onHideKnownChange={onHideKnownChange}
            sortMode={sortMode}
            onSortChange={onSortChange}
            visibleCount={visibleCount}
          />
        </div>
      ) : null}
    </section>
  );
}
