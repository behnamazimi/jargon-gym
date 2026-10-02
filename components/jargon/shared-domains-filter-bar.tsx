import { Search, X } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleChip } from "@/components/ui/toggle";
import type { useSharedDomainsBrowse } from "@/hooks/use-shared-domains-browse";
import type { BrowseCollectionFilter } from "@/lib/jargon/browse";
import { cn, pluralize } from "@/lib/utils";

const FILTERS: Array<{
  value: BrowseCollectionFilter;
  label: string;
  ariaLabel: string;
  countKey: "all" | "available" | "inCollection";
}> = [
  { value: "all", label: "All", ariaLabel: "Show all shared collections", countKey: "all" },
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

type SharedDomainsFilterBarProps = {
  browse: ReturnType<typeof useSharedDomainsBrowse>;
  searchInputRef: RefObject<HTMLInputElement | null>;
};

export function SharedDomainsFilterBar({ browse, searchInputRef }: SharedDomainsFilterBarProps) {
  return (
    <section
      aria-label="Filter shared collections"
      data-tour="browse-filters"
      className={cn(
        "shadow-surface space-y-3 rounded-box bg-base-100 p-4",
        "max-md:sticky max-md:z-30 max-md:top-0",
        "in-[.chrome-study]:max-md:top-[calc(2.75rem+env(safe-area-inset-top,0px))]",
      )}
    >
      <InputGroup className="h-11 min-h-11 cursor-text items-center">
        <InputGroupAddon>
          <Search className="size-4" aria-hidden strokeWidth={1.5} />
        </InputGroupAddon>
        <InputGroupInput
          ref={searchInputRef}
          type="search"
          value={browse.searchInput}
          onChange={(event) => browse.setSearchInput(event.target.value)}
          placeholder="Search collections…"
          aria-label="Search shared collections"
          className="h-11 min-w-0 text-sm"
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

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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
        <p
          className="text-sm tabular-nums text-base-content/70 max-md:text-start"
          aria-live="polite"
        >
          {pluralize(browse.matchingCount, "collection")}
          {browse.isRefreshing ? "…" : ""}
        </p>
      </div>
    </section>
  );
}
