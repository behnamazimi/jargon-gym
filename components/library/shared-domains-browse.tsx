"use client";

import { useRef, useState } from "react";
import { ReportCollectionDialog } from "@/components/library/report-collection-dialog";
import { SharedDomainCard } from "@/components/library/shared-domain-card";
import { BROWSE_PANEL_ID } from "@/components/library/shared-domains-tabs";
import { SharedDomainsFilterBar } from "@/components/library/shared-domains-filter-bar";
import {
  SharedDomainsEmptyCatalog,
  SharedDomainsEmptyGroup,
  SharedDomainsNoMatches,
} from "@/components/library/shared-domains-empty-states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { setCollectionLove } from "@/app/(private)/app/actions";
import { useToast } from "@/components/ui/toast";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import { useSharedDomainsBrowse } from "@/hooks/use-shared-domains-browse";
import { useSlashToFocus } from "@/hooks/use-slash-to-focus";
import type { BrowseGroup, BrowsePageResult } from "@/lib/library/browse";
import type { RequestEntry } from "@/lib/requests/entry";
import { cn } from "@/lib/utils";

type SharedDomainsBrowseProps = {
  initialPage: BrowsePageResult;
  initialGroup: BrowseGroup;
  requestEntry: RequestEntry;
};

function EmptyResults({
  browse,
  allAdded,
  requestEntry,
  onClearFilters,
}: {
  browse: ReturnType<typeof useSharedDomainsBrowse>;
  allAdded: boolean;
  requestEntry: RequestEntry;
  onClearFilters: () => void;
}) {
  if (browse.isRefreshing) return null;
  if (!browse.hasActiveFilters) {
    return <SharedDomainsEmptyGroup group={browse.group} requestEntry={requestEntry} />;
  }
  return (
    <SharedDomainsNoMatches
      group={browse.group}
      allAdded={allAdded}
      hasActiveFilters={browse.hasActiveFilters}
      onClearFilters={onClearFilters}
      onRetry={browse.retry}
      requestEntry={requestEntry}
      search={browse.searchInput}
    />
  );
}

export function SharedDomainsBrowse({
  initialPage,
  initialGroup,
  requestEntry,
}: SharedDomainsBrowseProps) {
  const { error, busyId, addToCollection, removeFromCollection } = useCollectionActions();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const browse = useSharedDomainsBrowse({ initialPage, initialGroup });
  const { toast } = useToast();
  const [reporting, setReporting] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useSlashToFocus(searchInputRef);

  const [justAdded, setJustAdded] = useState<ReadonlySet<string>>(new Set());

  function setAddedNow(domainId: string, added: boolean) {
    setJustAdded((current) => {
      const next = new Set(current);
      if (added) next.add(domainId);
      else next.delete(domainId);
      return next;
    });
  }

  async function handleAdd(domainId: string) {
    const name = browse.domains.find((domain) => domain.id === domainId)?.name;
    browse.markInCollection(domainId, true);
    const ok = await addToCollection(domainId);
    if (!ok) {
      browse.retry();
      return;
    }
    setAddedNow(domainId, true);
    toast(name ? `Added "${name}"` : "Added to your library", "success");
  }

  async function handleRemove(domainId: string) {
    browse.markInCollection(domainId, false);
    setAddedNow(domainId, false);
    const ok = await removeFromCollection(domainId);
    if (!ok) browse.retry();
  }

  async function handleToggleLove(domainId: string, loved: boolean) {
    browse.markLoved(domainId, loved);
    const result = await setCollectionLove(domainId, loved);
    if (result.error) {
      browse.markLoved(domainId, !loved);
      toast(result.error, "destructive");
      return;
    }
    if (result.count !== undefined) browse.markLoved(domainId, loved, result.count);
  }

  const allAdded =
    browse.filter === "available" &&
    browse.searchInput.trim() === "" &&
    browse.counts.available === 0 &&
    browse.counts.all > 0;
  const bannerError = error ?? browse.listError;

  if (browse.isEmptyCatalog) {
    return <SharedDomainsEmptyCatalog bannerError={bannerError} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {bannerError ? (
        <Alert variant="destructive">
          <AlertDescription>{bannerError}</AlertDescription>
        </Alert>
      ) : null}

      <SharedDomainsFilterBar browse={browse} searchInputRef={searchInputRef} />

      <div
        role="tabpanel"
        id={BROWSE_PANEL_ID}
        tabIndex={0}
        aria-labelledby={`browse-tab-${browse.group}`}
        className="space-y-4"
      >
        {browse.domains.length === 0 ? (
          <EmptyResults
            browse={browse}
            allAdded={allAdded}
            requestEntry={requestEntry}
            onClearFilters={() => {
              browse.clearFilters();
              searchInputRef.current?.focus();
            }}
          />
        ) : (
          <ul className={cn("flex flex-col gap-3", browse.isRefreshing && "opacity-70")}>
            {browse.domains.map((domain) => (
              <li key={domain.id}>
                <SharedDomainCard
                  domain={domain}
                  busy={busyId === domain.id}
                  justAdded={justAdded.has(domain.id)}
                  onAdd={() => void handleAdd(domain.id)}
                  onRemove={() => void handleRemove(domain.id)}
                  onToggleLove={() => void handleToggleLove(domain.id, !domain.lovedByMe)}
                  onReport={() => setReporting({ id: domain.id, name: domain.name })}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {reporting ? (
        <ReportCollectionDialog
          domainId={reporting.id}
          domainName={reporting.name}
          onReported={() => browse.markReported(reporting.id)}
          onClose={() => setReporting(null)}
        />
      ) : null}

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
