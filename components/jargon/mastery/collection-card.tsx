import { PauseCircle } from "lucide-react";
import type { CollectionStatBreakdown } from "@/lib/jargon/collection-stats";
import { formatPaceLine, formatUnseenFootnote } from "./mastery-format";
import { cn } from "@/lib/utils";

type CollectionCardData = {
  id: string;
  name: string;
  termsLearnedCount: number;
  totalCount: number;
  percentage: number;
};

function CollectionCardShell({
  collection,
  strengthPercent,
  footnote,
  paceLine,
  paused,
  onSelect,
}: {
  collection: CollectionCardData;
  strengthPercent?: number;
  footnote?: string;
  paceLine?: string | null;
  paused?: boolean;
  onSelect?: () => void;
}) {
  const content = (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-base-content">
          {paused ? (
            <PauseCircle className="size-3.5 shrink-0 text-base-content/50" aria-label="Paused" />
          ) : null}
          <span className="truncate">{collection.name}</span>
        </span>
        <span className="shrink-0 tabular-nums text-base-content/60">
          {collection.termsLearnedCount}/{collection.totalCount} learned
        </span>
      </div>
      <progress
        className="progress progress-primary h-1.5 w-full"
        value={collection.percentage}
        max={100}
        aria-label={`${collection.name} learned ${collection.percentage}%`}
      />
      {strengthPercent !== undefined ? (
        <p className="text-sm font-semibold text-base-content">{strengthPercent}% strength</p>
      ) : null}
      {footnote ? <p className="text-xs text-base-content/50">{footnote}</p> : null}
      {paceLine ? <p className="text-xs text-base-content/50">{paceLine}</p> : null}
    </div>
  );

  const className = cn(
    "shadow-surface rounded-2xl bg-base-100 p-4 text-left",
    paused && "opacity-60",
  );

  if (!onSelect) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        className,
        "w-full cursor-pointer transition-colors hover:bg-base-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
    >
      {content}
    </button>
  );
}

/** An active collection's progress — the Overview tab's primary content.
 *  Clicking it jumps to the Terms tab pre-filtered to this collection. */
export function CollectionCard({
  collection,
  onSelect,
}: {
  collection: CollectionStatBreakdown;
  onSelect: (collectionId: string) => void;
}) {
  return (
    <CollectionCardShell
      collection={collection}
      strengthPercent={Math.round(collection.currentStrength * 100)}
      footnote={formatUnseenFootnote(collection)}
      paceLine={formatPaceLine(collection.paceInsight)}
      onSelect={() => onSelect(collection.id)}
    />
  );
}

/** A paused collection — same shape, dimmed with a paused icon next to its
 *  name, no footnote/pace, not interactive (nothing to drill into while
 *  paused). Rendered alongside active cards, sorted after them, rather
 *  than tucked behind a separate disclosure. */
export function PausedCollectionCard({ collection }: { collection: CollectionCardData }) {
  return <CollectionCardShell collection={collection} paused />;
}
