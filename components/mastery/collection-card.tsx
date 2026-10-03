import { BookOpen, PauseCircle } from "lucide-react";
import type { ReactNode } from "react";
import { LinkButton } from "@/components/ui/button";
import type { CollectionStatBreakdown } from "@/lib/mastery/collection-stats";
import type { MasteryBucketCounts } from "@/lib/trace";
import { formatPaceLine, formatUnseenFootnote } from "./mastery-format";
import { cn, pluralize } from "@/lib/utils";

type CollectionCardData = {
  id: string;
  name: string;
  termsLearnedCount: number;
  markedKnownCount: number;
  totalCount: number;
  percentage: number;
};

/** A term sits in exactly one of three buckets (see
 *  lib/trace/pace.ts's partitionMasteryBuckets) — mastered, learning
 *  (any activity, not mastered), or not started (no activity). Marked-known
 *  terms are excluded from this bar. */
function BucketProgress({ buckets, name }: { buckets: MasteryBucketCounts; name: string }) {
  const total = buckets.mastered + buckets.learningNotMastered + buckets.neverLearning;
  const pct = (count: number) => (total > 0 ? (count / total) * 100 : 0);

  return (
    <div className="space-y-2">
      <div
        className="flex h-2 w-full gap-1 rounded-full bg-base-300"
        role="img"
        aria-label={`${name}: ${buckets.mastered} mastered, ${buckets.learningNotMastered} learning, ${buckets.neverLearning} not started`}
      >
        <div className="rounded-full bg-success" style={{ width: `${pct(buckets.mastered)}%` }} />
        <div
          className="rounded-full bg-primary"
          style={{ width: `${pct(buckets.learningNotMastered)}%` }}
        />
      </div>
      <p className="text-xs text-base-content/70">
        <span className="tabular-nums">{buckets.mastered}</span> mastered ·{" "}
        <span className="tabular-nums">{buckets.learningNotMastered}</span> learning ·{" "}
        <span className="tabular-nums">{buckets.neverLearning}</span> not started
      </p>
    </div>
  );
}

function CollectionCardShell({
  collection,
  buckets,
  strengthPercent,
  footnote,
  paceLine,
  paused,
  onSelect,
  footer,
}: {
  collection: CollectionCardData;
  buckets?: MasteryBucketCounts;
  strengthPercent?: number;
  footnote?: string;
  paceLine?: string | null;
  paused?: boolean;
  onSelect?: () => void;
  footer?: ReactNode;
}) {
  const content = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium text-base-content">
          {paused ? (
            <PauseCircle className="size-3.5 shrink-0 text-base-content/70" aria-label="Paused" />
          ) : null}
          <span className="truncate">{collection.name}</span>
        </span>
        <span className="shrink-0 tabular-nums text-base-content/70">
          {collection.totalCount} terms
        </span>
      </div>
      {buckets ? (
        <BucketProgress buckets={buckets} name={collection.name} />
      ) : (
        <div className="space-y-2">
          <progress
            className="progress progress-success h-1.5 w-full"
            value={collection.percentage}
            max={100}
            aria-label={`${collection.name} mastered ${collection.percentage}%`}
          />
          <p className="text-xs text-base-content/70">
            <span className="tabular-nums">{collection.termsLearnedCount}</span>/
            <span className="tabular-nums">{collection.totalCount}</span> mastered
          </p>
        </div>
      )}
      {strengthPercent !== undefined ? (
        <p className="text-sm font-medium text-base-content">
          {strengthPercent}% recall strength
          {buckets ? (
            <span className="font-normal text-base-content/70">
              {" "}
              across {pluralize(buckets.mastered + buckets.learningNotMastered, "started term")}
            </span>
          ) : null}
        </p>
      ) : null}
      {footnote ? <p className="text-xs tabular-nums text-base-content/70">{footnote}</p> : null}
      {paceLine ? <p className="text-xs text-base-content/70">{paceLine}</p> : null}
      {collection.markedKnownCount > 0 ? (
        <p className="text-xs text-base-content/70">
          <span className="tabular-nums">{collection.markedKnownCount}</span> marked known by you
        </p>
      ) : null}
    </div>
  );

  const surface = cn("shadow-surface rounded-box bg-base-100 text-left", paused && "opacity-60");

  if (!onSelect) {
    return <div className={cn(surface, "p-5")}>{content}</div>;
  }

  // The footer holds a link, which can't sit inside the card's button.
  return (
    <div className={surface}>
      <button
        type="button"
        onClick={onSelect}
        className="w-full cursor-pointer rounded-box p-5 text-left transition-colors hover:bg-base-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {content}
      </button>
      {footer ? <div className="px-4 pb-4">{footer}</div> : null}
    </div>
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
      buckets={collection.paceInsight.buckets}
      strengthPercent={Math.round(collection.currentStrength * 100)}
      footnote={
        collection.unseenCount === collection.paceInsight.buckets.neverLearning
          ? undefined
          : formatUnseenFootnote(collection)
      }
      paceLine={formatPaceLine(collection.paceInsight)}
      onSelect={() => onSelect(collection.id)}
      footer={
        <LinkButton
          href={`/jargon/review?domain=${collection.id}`}
          variant="outline"
          size="sm"
          className="min-h-11 gap-2 md:min-h-8"
          aria-label={`Practice ${collection.name} in Review`}
        >
          <BookOpen className="size-4" aria-hidden strokeWidth={1.5} />
          Review
        </LinkButton>
      }
    />
  );
}

/** A paused collection — same shape, dimmed with a paused icon next to its
 *  name, no footnote/pace, not interactive (nothing to drill into while
 *  paused). No bucket breakdown available for paused collections (their
 *  trace candidates aren't fetched), so this falls back to the single
 *  mastered-count bar. Rendered alongside active cards, sorted after them,
 *  rather than tucked behind a separate disclosure. */
export function PausedCollectionCard({ collection }: { collection: CollectionCardData }) {
  return <CollectionCardShell collection={collection} paused />;
}
