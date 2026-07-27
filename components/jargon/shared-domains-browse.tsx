"use client";

import { Compass, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { PageHeader } from "@/components/jargon/page-header";
import { SharedDomainCard } from "@/components/jargon/shared-domain-card";
import { PageShell } from "@/components/page-container";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import type { SharedDomain } from "@/lib/jargon/types";
import { cn } from "@/lib/utils";

type SharedDomainsBrowseProps = {
  domains: SharedDomain[];
};

type CollectionFilter = "all" | "available" | "in-collection";

function filterChipClassName(selected: boolean) {
  return cn(
    "h-7 min-h-7 rounded-lg px-3 py-0 text-xs font-normal",
    selected
      ? "border-primary bg-primary/10 text-primary hover:bg-primary/15 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-selected:border-primary data-selected:bg-primary/10 data-selected:text-primary"
      : "border-base-300/80 text-base-content hover:bg-base-200/60",
  );
}

function matchesSearch(domain: SharedDomain, query: string) {
  const haystack = `${domain.name} ${domain.description}`.toLowerCase();
  return haystack.includes(query);
}

export function SharedDomainsBrowse({ domains }: SharedDomainsBrowseProps) {
  const { error, busyId, addToCollection, removeFromCollection } = useCollectionActions();
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>("all");

  const inCollectionCount = useMemo(
    () => domains.filter((domain) => domain.inCollection).length,
    [domains],
  );
  const availableCount = domains.length - inCollectionCount;

  const filteredDomains = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return domains.filter((domain) => {
      if (collectionFilter === "available" && domain.inCollection) return false;
      if (collectionFilter === "in-collection" && !domain.inCollection) return false;
      if (query && !matchesSearch(domain, query)) return false;
      return true;
    });
  }, [collectionFilter, domains, searchQuery]);

  const hasActiveFilters = searchQuery.trim().length > 0 || collectionFilter !== "all";

  return (
    <PageShell innerClassName="landing-enter">
      <PageHeader
        icon={Compass}
        title="Browse shared collections"
        description="Find collections others have shared and add them to yours."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {domains.length === 0 ? (
        <div className="shadow-surface rounded-2xl border border-dashed border-base-300/80 bg-base-100 px-6 py-14 text-center">
          <p className="text-sm text-base-content/60">Nothing shared yet.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-base-content/60">
            When someone shares a collection, it'll show up here. Add any you find to yours.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <section
            aria-label="Filter shared collections"
            className="shadow-surface space-y-3 rounded-2xl bg-base-100 p-4"
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-base-content/60"
                aria-hidden
                strokeWidth={1.5}
              />
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name or description…"
                aria-label="Search shared collections"
                className="rounded-lg py-2.5 pr-10 pl-9 text-sm"
              />
              {searchQuery ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 text-base-content/60 hover:text-base-content"
                  onPress={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X className="size-3.5" aria-hidden strokeWidth={1.5} />
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <Toggle
                  size="sm"
                  isSelected={collectionFilter === "all"}
                  onChange={() => setCollectionFilter("all")}
                  aria-label="Show all shared collections"
                  className={filterChipClassName(collectionFilter === "all")}
                >
                  All{" "}
                  <span
                    className={cn(
                      "tabular-nums opacity-55",
                      collectionFilter === "all" && "text-primary opacity-80",
                    )}
                  >
                    {domains.length}
                  </span>
                </Toggle>
                <Toggle
                  size="sm"
                  isSelected={collectionFilter === "available"}
                  onChange={() => setCollectionFilter("available")}
                  aria-label="Show collections not in yours"
                  className={filterChipClassName(collectionFilter === "available")}
                >
                  Available{" "}
                  <span
                    className={cn(
                      "tabular-nums opacity-55",
                      collectionFilter === "available" && "text-primary opacity-80",
                    )}
                  >
                    {availableCount}
                  </span>
                </Toggle>
                <Toggle
                  size="sm"
                  isSelected={collectionFilter === "in-collection"}
                  onChange={() => setCollectionFilter("in-collection")}
                  aria-label="Show collections you've added"
                  className={filterChipClassName(collectionFilter === "in-collection")}
                >
                  In collection{" "}
                  <span
                    className={cn(
                      "tabular-nums opacity-55",
                      collectionFilter === "in-collection" && "text-primary opacity-80",
                    )}
                  >
                    {inCollectionCount}
                  </span>
                </Toggle>
              </div>
              <p className="text-sm tabular-nums text-base-content/60">
                {filteredDomains.length} shown
              </p>
            </div>
          </section>

          {filteredDomains.length === 0 ? (
            <div className="shadow-surface rounded-2xl bg-base-100 px-6 py-12 text-center">
              <p className="text-sm text-base-content/60">No collections match your filters.</p>
              {hasActiveFilters ? (
                <p className="mt-1 text-xs text-base-content/60">
                  Clear your search or try a different filter.
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {filteredDomains.map((domain) => (
                <li key={domain.id}>
                  <SharedDomainCard
                    domain={domain}
                    busy={busyId === domain.id}
                    onAdd={() => addToCollection(domain.id)}
                    onRemove={() => removeFromCollection(domain.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </PageShell>
  );
}
