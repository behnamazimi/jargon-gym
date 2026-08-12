"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { SortMode } from "@/lib/jargon/types";
import type { RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CategoryChips } from "./category-chips";
import { SearchBar } from "./search-bar";
import { Toolbar } from "./toolbar";

type JargonFiltersProps = {
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
  showStrength: boolean;
  onShowStrengthChange: (value: boolean) => void;
  sortMode: SortMode;
  onSortChange: (value: SortMode) => void;
  visibleCount: number;
};

function countActiveFilters(
  activeCategories: Set<string>,
  hideKnown: boolean,
  showStrength: boolean,
  sortMode: SortMode,
) {
  let count = 0;
  if (activeCategories.size > 0) count += 1;
  if (hideKnown) count += 1;
  if (showStrength) count += 1;
  if (sortMode !== "default") count += 1;
  return count;
}

export function JargonFilters({
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
  showStrength,
  onShowStrengthChange,
  sortMode,
  onSortChange,
  visibleCount,
}: JargonFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const activeFilterCount = useMemo(
    () => countActiveFilters(activeCategories, hideKnown, showStrength, sortMode),
    [activeCategories, hideKnown, showStrength, sortMode],
  );

  return (
    <section
      aria-label="Filter terms"
      className="shadow-surface space-y-3 rounded-2xl bg-base-100 p-4"
    >
      <div className="flex items-start gap-2">
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
          aria-controls="jargon-advanced-filters"
          onPress={() => setExpanded((value) => !value)}
          className={cn("shrink-0 gap-1.5", expanded && "bg-base-200")}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden strokeWidth={1.5} />
          Filters
          {!expanded && activeFilterCount > 0 ? (
            <Badge variant="secondary" className="min-w-5 px-1.5 py-0 text-[10px] tabular-nums">
              {activeFilterCount}
            </Badge>
          ) : null}
        </Button>
      </div>

      {expanded ? (
        <div id="jargon-advanced-filters" className="space-y-3">
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
            showStrength={showStrength}
            onShowStrengthChange={onShowStrengthChange}
            sortMode={sortMode}
            onSortChange={onSortChange}
            visibleCount={visibleCount}
          />
        </div>
      ) : null}
    </section>
  );
}
