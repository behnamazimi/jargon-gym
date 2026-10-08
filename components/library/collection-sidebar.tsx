"use client";

import { PauseCircle, Plus, Search, X } from "lucide-react";
import { useLinkStatus } from "next/link";
import { useMemo, useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rememberLibraryCollection } from "@/lib/library/pick-collection";
import type { Collection } from "@/lib/terms/types";
import { cn } from "@/lib/utils";

type CollectionSidebarProps = {
  collections: Collection[];
  currentCollectionId: string;
  onCollectionSelect?: () => void;
  className?: string;
};

/** Shown on the collection being opened until its list arrives. */
function OpeningIndicator() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span className="loading loading-spinner loading-xs ml-auto shrink-0" aria-label="Opening" />
  ) : null;
}

function CollectionSidebarSection({
  label,
  collections,
  currentCollectionId,
  onSelect,
}: {
  label: string;
  collections: Collection[];
  currentCollectionId: string;
  onSelect: () => void;
}) {
  if (collections.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="px-2 text-xs font-semibold tracking-wider text-base-content/70 uppercase">
        {label}
      </p>
      <ul className="space-y-1">
        {collections.map((collection) => {
          const isSelected = collection.id === currentCollectionId;
          return (
            <li key={collection.id}>
              <LinkButton
                href={`/app/library?collection=${collection.id}`}
                variant="ghost"
                aria-current={isSelected ? "page" : undefined}
                aria-label={
                  collection.source === "added"
                    ? `${collection.name} (added to your collection)`
                    : collection.name
                }
                onPress={() => {
                  rememberLibraryCollection(collection.id);
                  onSelect();
                }}
                className={cn(
                  "h-auto w-full flex-col items-start gap-1 rounded-field px-3 py-2 text-left",
                  isSelected
                    ? "bg-base-200 text-base-content hover:bg-base-200"
                    : "hover:bg-base-200/60",
                )}
              >
                <span className="flex w-full min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {collection.icon ? `${collection.icon} ` : ""}
                    {collection.name}
                  </span>
                  {!collection.isActiveForReview ? (
                    <PauseCircle
                      className="ml-auto size-3.5 shrink-0 opacity-50"
                      aria-label="Paused"
                      strokeWidth={1.5}
                    />
                  ) : null}
                  <OpeningIndicator />
                </span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    isSelected ? "text-primary-text" : "text-base-content/70",
                  )}
                >
                  {collection.termsLearnedCount} of {collection.termCount} mastered or known
                  {collection.unfinishedCount > 0
                    ? ` · ${collection.unfinishedCount} to finish`
                    : ""}
                </span>
              </LinkButton>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CollectionSidebar({
  collections,
  currentCollectionId,
  onCollectionSelect,
  className,
}: CollectionSidebarProps) {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredCollections = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return collections;
    return collections.filter((collection) => collection.name.toLowerCase().includes(query));
  }, [collections, filterQuery]);

  const ownedCollections = useMemo(
    () => filteredCollections.filter((collection) => collection.source === "owned"),
    [filteredCollections],
  );
  const addedCollections = useMemo(
    () => filteredCollections.filter((collection) => collection.source === "added"),
    [filteredCollections],
  );

  function handleSelect() {
    onCollectionSelect?.();
  }

  if (collections.length === 0) return null;

  return (
    <nav
      aria-label="Collections"
      data-tour="library-collections"
      className={cn("flex min-h-0 flex-col gap-2 p-1", className)}
    >
      <div className="relative shrink-0">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-base-content/70"
          aria-hidden
          strokeWidth={1.5}
        />
        <Input
          type="search"
          value={filterQuery}
          onChange={(event) => setFilterQuery(event.target.value)}
          placeholder="Search collections…"
          aria-label="Search collections"
          className="rounded-field py-2 pr-8 pl-8 text-base sm:text-sm"
        />
        {filterQuery ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-base-content/70 hover:text-base-content"
            onPress={() => setFilterQuery("")}
            aria-label="Clear filter"
          >
            <X className="size-3.5" aria-hidden strokeWidth={1.5} />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {filteredCollections.length === 0 ? (
          <p className="px-2 text-sm text-base-content/70">No collections match your search.</p>
        ) : (
          <>
            <CollectionSidebarSection
              label="Owned"
              collections={ownedCollections}
              currentCollectionId={currentCollectionId}
              onSelect={handleSelect}
            />
            <CollectionSidebarSection
              label="Added"
              collections={addedCollections}
              currentCollectionId={currentCollectionId}
              onSelect={handleSelect}
            />
          </>
        )}
      </div>

      <LinkButton
        href="/app/import"
        variant="outline"
        className="w-full shrink-0 justify-start gap-2 border-dashed"
        onPress={onCollectionSelect}
      >
        <Plus className="size-4" aria-hidden strokeWidth={1.5} />
        Add collection
      </LinkButton>
    </nav>
  );
}
