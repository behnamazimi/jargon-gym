import { Compass, SearchX } from "lucide-react";
import { EmptyState } from "@/components/jargon/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequestRow } from "@/components/requests/request-row";
import { Button, LinkButton } from "@/components/ui/button";
import type { RequestEntry } from "@/lib/requests/entry";

export function SharedDomainsEmptyCatalog({ bannerError }: { bannerError: string | null }) {
  return (
    <div className="space-y-4">
      {bannerError ? (
        <Alert variant="destructive">
          <AlertDescription>{bannerError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="shadow-surface rounded-box bg-base-100 px-6 py-14">
        <EmptyState
          icon={Compass}
          title="Nothing shared yet"
          description="When someone shares a collection, it shows up here. Add your own terms in the meantime, or head back to your library."
        >
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <LinkButton href="/jargon/import" className="min-h-11">
              Add your own terms
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

export function SharedDomainsNoMatches({
  hasActiveFilters,
  onClearFilters,
  onRetry,
  requestEntry,
  search,
}: {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onRetry: () => void;
  requestEntry: RequestEntry;
  search: string;
}) {
  return (
    <div className="space-y-3">
      <div className="shadow-surface rounded-box bg-base-100 px-6 py-12">
        <EmptyState
          icon={SearchX}
          title="No collections match"
          description={
            hasActiveFilters
              ? "Clear your search or try a different filter."
              : "Nothing to show right now."
          }
        >
          {hasActiveFilters ? (
            <Button type="button" variant="outline" className="min-h-11" onPress={onClearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button type="button" variant="outline" className="min-h-11" onPress={onRetry}>
              Try again
            </Button>
          )}
        </EmptyState>
      </div>
      <RequestRow entry={requestEntry} query={search} />
    </div>
  );
}
