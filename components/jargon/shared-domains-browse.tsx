"use client";

import { Compass, Search, SearchX, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { EmptyState } from "@/components/jargon/empty-state";
import { SharedDomainCard } from "@/components/jargon/shared-domain-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import { useSharedDomainsBrowse } from "@/hooks/use-shared-domains-browse";
import type { BrowseCollectionFilter, BrowsePageResult } from "@/lib/jargon/browse";
import { cn, pluralize } from "@/lib/utils";

type SharedDomainsBrowseProps = {
  initialPage: BrowsePageResult;
};

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

function chipClassName(selected: boolean) {
  return cn(
    "h-11 min-h-11 rounded-lg px-3 py-0 text-xs font-normal md:h-7 md:min-h-7",
    selected
      ? "border-primary bg-primary/10 text-primary hover:bg-primary/15 data-selected:border-primary data-selected:bg-primary/10 data-selected:text-primary"
      : "border-base-300/80 text-base-content hover:bg-base-200/60",
  );
}

export function SharedDomainsBrowse({ initialPage }: SharedDomainsBrowseProps) {
  const { error, busyId, addToCollection, removeFromCollection } = useCollectionActions();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const browse = useSharedDomainsBrowse({ initialPage });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/") return;
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      event.preventDefault();
      searchInputRef.current?.focus();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleAdd(domainId: string) {
    const ok = await addToCollection(domainId);
    if (ok) browse.markInCollection(domainId, true);
  }

  async function handleRemove(domainId: string) {
    const ok = await removeFromCollection(domainId);
    if (ok) browse.markInCollection(domainId, false);
  }

  const bannerError = error ?? browse.listError;

  if (browse.isEmptyCatalog) {
    return (
      <div className="space-y-4">
        {bannerError ? (
          <Alert variant="destructive">
            <AlertDescription>{bannerError}</AlertDescription>
          </Alert>
        ) : null}
        <div className="shadow-surface rounded-2xl bg-base-100 px-6 py-14">
          <EmptyState
            icon={Compass}
            title="Nothing shared yet"
            description="When someone shares a collection, it shows up here. Import your own jargon in the meantime, or head back to your library."
          >
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <LinkButton href="/jargon/import" className="min-h-11">
                Import jargon
              </LinkButton>
              <LinkButton href="/jargon" variant="outline" className="min-h-11">
                Back to library
              </LinkButton>
            </div>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bannerError ? (
        <Alert variant="destructive">
          <AlertDescription>{bannerError}</AlertDescription>
        </Alert>
      ) : null}

      <section
        aria-label="Filter shared collections"
        className={cn(
          "shadow-surface space-y-3 rounded-2xl bg-base-100 p-4",
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
            <span className="loading loading-spinner loading-sm me-2 text-base-content/60" />
          ) : browse.searchInput ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="me-1 min-h-11 min-w-11 text-base-content/60 hover:text-base-content"
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
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Collection status">
            {FILTERS.map((item) => {
              const selected = browse.filter === item.value;
              return (
                <Toggle
                  key={item.value}
                  size="sm"
                  isSelected={selected}
                  onChange={() => browse.setFilter(item.value)}
                  aria-label={item.ariaLabel}
                  className={chipClassName(selected)}
                >
                  {item.label}{" "}
                  <span
                    className={cn("tabular-nums opacity-55", selected && "text-primary opacity-80")}
                  >
                    {browse.counts[item.countKey]}
                  </span>
                </Toggle>
              );
            })}
          </div>
          <p
            className="text-sm tabular-nums text-base-content/60 max-md:text-center"
            aria-live="polite"
          >
            {pluralize(browse.matchingCount, "collection")}
            {browse.isRefreshing ? "…" : ""}
          </p>
        </div>
      </section>

      {browse.domains.length === 0 ? (
        <div className="shadow-surface rounded-2xl bg-base-100 px-6 py-12">
          <EmptyState
            icon={SearchX}
            title="No collections match"
            description={
              browse.hasActiveFilters
                ? "Clear your search or try a different filter."
                : "Nothing to show right now."
            }
          >
            {browse.hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onPress={() => {
                  browse.clearFilters();
                  searchInputRef.current?.focus();
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button type="button" variant="outline" className="min-h-11" onPress={browse.retry}>
                Try again
              </Button>
            )}
          </EmptyState>
        </div>
      ) : (
        <ul className={cn("flex flex-col gap-3", browse.isRefreshing && "opacity-70")}>
          {browse.domains.map((domain) => (
            <li key={domain.id}>
              <SharedDomainCard
                domain={domain}
                busy={busyId === domain.id}
                onAdd={() => void handleAdd(domain.id)}
                onRemove={() => void handleRemove(domain.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {browse.nextOffset !== null ? (
        <div
          ref={browse.bindSentinel}
          data-browse-sentinel
          className="flex min-h-11 items-center justify-center py-3"
        >
          {browse.isLoadingMore ? (
            <span className="loading loading-spinner loading-sm text-base-content/60" />
          ) : (
            <span className="sr-only">Loading more collections</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
