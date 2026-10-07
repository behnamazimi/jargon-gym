import { Compass, LibraryBig, SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequestRow } from "@/components/requests/request-row";
import { Button, LinkButton } from "@/components/ui/button";
import type { BrowseGroup } from "@/lib/library/browse";
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
          title="No collections yet"
          description="Collections show up here once they are built or shared. Add your own terms in the meantime, or head back to your library."
        >
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <LinkButton href="/app/import" className="min-h-11">
              Add your own terms
            </LinkButton>
            <LinkButton href="/app/library" variant="outline" className="min-h-11">
              Back to library
            </LinkButton>
          </div>
        </EmptyState>
      </div>
    </div>
  );
}

const GROUP_LABEL: Record<BrowseGroup, string> = {
  builtin: "built-in",
  community: "community",
};

export function SharedDomainsEmptyGroup({
  group,
  requestEntry,
}: {
  group: BrowseGroup;
  requestEntry: RequestEntry;
}) {
  return (
    <div className="space-y-3">
      <div className="shadow-surface rounded-box bg-base-100 px-6 py-12">
        <EmptyState
          icon={Compass}
          title={`No ${GROUP_LABEL[group]} collections yet`}
          description={
            group === "builtin"
              ? "Collections we build will show up here."
              : "When a member shares a collection, it shows up here."
          }
        />
      </div>
      <RequestRow entry={requestEntry} query="" />
    </div>
  );
}

export function SharedDomainsNoMatches({
  group,
  allAdded,
  hasActiveFilters,
  onClearFilters,
  onRetry,
  requestEntry,
  search,
}: {
  group: BrowseGroup;
  allAdded: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onRetry: () => void;
  requestEntry: RequestEntry;
  search: string;
}) {
  if (allAdded) {
    return (
      <div className="shadow-surface rounded-box bg-base-100 px-6 py-12">
        <EmptyState
          icon={LibraryBig}
          title={`You've added every ${GROUP_LABEL[group]} collection`}
          description="Open your library to start studying them."
        >
          <LinkButton href="/app/library" className="min-h-11">
            Go to library
          </LinkButton>
        </EmptyState>
      </div>
    );
  }

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
