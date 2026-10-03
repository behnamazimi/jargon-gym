"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { SharedDomainCard } from "@/components/library/shared-domain-card";
import { SharedDomainsFilterBar } from "@/components/library/shared-domains-filter-bar";
import {
  SharedDomainsEmptyCatalog,
  SharedDomainsNoMatches,
} from "@/components/library/shared-domains-empty-states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import { useSharedDomainsBrowse } from "@/hooks/use-shared-domains-browse";
import { useSlashToFocus } from "@/hooks/use-slash-to-focus";
import type { BrowsePageResult } from "@/lib/library/browse";
import type { RequestEntry } from "@/lib/requests/entry";
import { cn } from "@/lib/utils";

type SharedDomainsBrowseProps = {
  initialPage: BrowsePageResult;
  requestEntry: RequestEntry;
};

export function SharedDomainsBrowse({ initialPage, requestEntry }: SharedDomainsBrowseProps) {
  const { error, busyId, addToCollection, removeFromCollection } = useCollectionActions();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const browse = useSharedDomainsBrowse({ initialPage });
  const router = useRouter();
  const { toast } = useToast();

  useSlashToFocus(searchInputRef);

  async function handleAdd(domainId: string) {
    const name = browse.domains.find((domain) => domain.id === domainId)?.name;
    browse.markInCollection(domainId, true);
    const ok = await addToCollection(domainId);
    if (!ok) {
      browse.retry();
      return;
    }
    // Added collections are always active, so Read can open on it.
    toast(name ? `Added "${name}"` : "Added to your library", "success", {
      action: {
        label: "Start reading",
        onPress: () => router.push(`/jargon/read?domain=${domainId}`),
      },
    });
  }

  async function handleRemove(domainId: string) {
    browse.markInCollection(domainId, false);
    const ok = await removeFromCollection(domainId);
    if (!ok) browse.retry();
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
          requestEntry={requestEntry}
          search={browse.searchInput}
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
            <span className="loading loading-spinner loading-sm text-base-content/70" />
          ) : (
            <span className="sr-only">Loading more collections</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
