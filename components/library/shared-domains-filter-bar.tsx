"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState, type RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { SharedDomainsTabs } from "@/components/library/shared-domains-tabs";
import { ToggleChip } from "@/components/ui/toggle";
import type { useSharedDomainsBrowse } from "@/hooks/use-shared-domains-browse";
import type { BrowseCollectionFilter, BrowseSort } from "@/lib/library/browse";
import { cn, pluralize } from "@/lib/utils";

const FILTERS: Array<{
  value: BrowseCollectionFilter;
  label: string;
  ariaLabel: string;
  countKey: "all" | "available" | "inCollection";
}> = [
  {
    value: "all",
    label: "All",
    ariaLabel: "Show all collections",
    countKey: "all",
  },
  {
    value: "available",
    label: "Available",
    ariaLabel: "Show collections not in yours",
    countKey: "available",
  },
  {
    value: "in-collection",
    label: "In collection",
    ariaLabel: "Show collections you've added",
    countKey: "inCollection",
  },
];

const SORTS: Array<{ value: BrowseSort; label: string }> = [
  { value: "name", label: "Name" },
  { value: "loved", label: "Most loved" },
];

/** On phones the filter bar is three separate blocks so only the search row can stay pinned. */
const CARD_ON_PHONE = "max-md:rounded-box max-md:bg-base-100 max-md:shadow-surface";

type SharedDomainsFilterBarProps = {
  browse: ReturnType<typeof useSharedDomainsBrowse>;
  searchInputRef: RefObject<HTMLInputElement | null>;
};

const FILTER_PANEL_ID = "browse-advanced-filters";

export function SharedDomainsFilterBar({ browse, searchInputRef }: SharedDomainsFilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const activeFilterCount = (browse.filter !== "all" ? 1 : 0) + (browse.sort !== "name" ? 1 : 0);

  return (
    <section
      aria-label="Filter collections"
      className="md:shadow-surface max-md:contents md:space-y-3 md:rounded-box md:bg-base-100 md:p-5"
    >
      <div className={cn(CARD_ON_PHONE, "max-md:p-3")} data-tour="browse-filters">
        <SharedDomainsTabs
          active={browse.group}
          counts={browse.counts.groups}
          onChange={browse.setGroup}
        />
      </div>

      <div className="flex items-stretch gap-2 max-md:sticky max-md:top-0 max-md:z-30 max-md:rounded-box max-md:bg-base-100 max-md:p-2 max-md:shadow-surface">
        <InputGroup className="h-11 min-h-11 min-w-0 flex-1 cursor-text items-center">
          <InputGroupAddon>
            <Search className="size-4" aria-hidden strokeWidth={1.5} />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchInputRef}
            type="search"
            value={browse.searchInput}
            onChange={(event) => browse.setSearchInput(event.target.value)}
            placeholder="Search collections…"
            aria-label="Search collections"
            className="h-11 min-w-0 text-base sm:text-sm"
          />
          {browse.isRefreshing ? (
            <span className="loading loading-spinner loading-sm me-2 text-base-content/70" />
          ) : browse.searchInput ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="me-1 min-h-11 min-w-11 text-base-content/70 hover:text-base-content"
              onPress={() => browse.setSearchInput("")}
              aria-label="Clear search"
            >
              <X className="size-3.5" aria-hidden strokeWidth={1.5} />
            </Button>
          ) : (
            <kbd className="kbd kbd-sm pointer-events-none me-1.5 hidden h-6 w-6 items-center justify-center p-0 text-[11px] leading-none md:inline-flex">
              <span className="inline-block translate-y-px">/</span>
            </kbd>
          )}
        </InputGroup>
        <Button
          type="button"
          variant="outline"
          aria-expanded={expanded}
          aria-controls={FILTER_PANEL_ID}
          onPress={() => setExpanded((value) => !value)}
          className={cn("min-h-11 shrink-0 gap-2 md:hidden", expanded && "bg-base-200")}
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

      <div
        id={FILTER_PANEL_ID}
        className={cn(
          CARD_ON_PHONE,
          "flex-col gap-2 max-md:p-3 md:flex md:flex-row md:items-center md:justify-between",
          expanded ? "flex" : "max-md:hidden",
        )}
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label="Collection status">
          {FILTERS.map((item) => {
            const selected = browse.filter === item.value;
            return (
              <ToggleChip
                key={item.value}
                isSelected={selected}
                onChange={() => browse.setFilter(item.value)}
                aria-label={item.ariaLabel}
              >
                {item.label}{" "}
                <span className="tabular-nums opacity-55 group-data-selected:opacity-80">
                  {browse.counts[item.countKey]}
                </span>
              </ToggleChip>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <label className="flex items-center gap-2 text-sm text-base-content/70">
            Sort by
            <select
              className="select select-sm min-h-11 w-auto md:min-h-8"
              value={browse.sort}
              onChange={(event) => browse.setSort(event.target.value as BrowseSort)}
            >
              {SORTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <p
            className="text-sm tabular-nums text-base-content/70 max-md:text-start"
            aria-live="polite"
          >
            {pluralize(browse.matchingCount, "collection")}
            {browse.isRefreshing ? "…" : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
