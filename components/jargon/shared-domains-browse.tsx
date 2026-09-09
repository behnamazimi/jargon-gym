"use client";

import { useEffect, useRef } from "react";
import { SharedDomainCard } from "@/components/jargon/shared-domain-card";
import { SharedDomainsFilterBar } from "@/components/jargon/shared-domains-filter-bar";
import {
  SharedDomainsEmptyCatalog,
  SharedDomainsNoMatches,
} from "@/components/jargon/shared-domains-empty-states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import { useSharedDomainsBrowse } from "@/hooks/use-shared-domains-browse";
import type { BrowsePageResult } from "@/lib/jargon/browse";
import { cn } from "@/lib/utils";

type SharedDomainsBrowseProps = {
  initialPage: BrowsePageResult;
};

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
    return <SharedDomainsEmptyCatalog bannerError={bannerError} />;
  }

  return (
    <div className="space-y-4">
      {bannerError ? (
        <Alert variant="destructive">
          <AlertDescription>{bannerError}</AlertDescription>
        </Alert>
      ) : null}

      <SharedDomainsFilterBar browse={browse} searchInputRef={searchInputRef} />

      {browse.domains.length === 0 ? (
        <SharedDomainsNoMatches
          hasActiveFilters={browse.hasActiveFilters}
          onClearFilters={() => {
            browse.clearFilters();
            searchInputRef.current?.focus();
          }}
          onRetry={browse.retry}
        />
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
