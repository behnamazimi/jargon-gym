import { PauseCircle } from "lucide-react";
import type { CollectionStatBreakdown } from "@/lib/jargon/collection-stats";
import type { MasteryBucketCounts } from "@/lib/trace";
import { formatPaceLine, formatUnseenFootnote } from "./mastery-format";
import { cn } from "@/lib/utils";

type CollectionCardData = {
  id: string;
  name: string;
  termsLearnedCount: number;
  totalCount: number;
  percentage: number;
};

/** A term sits in exactly one of three buckets (see
 *  lib/trace/pace.ts's partitionMasteryBuckets) — "mastered" alone is a
 *  binary crossed/not-crossed count, so showing just that and calling it
 *  "learned" implied a false binary. This shows all three segments instead. */
function BucketProgress({ buckets, name }: { buckets: MasteryBucketCounts; name: string }) {
  const total = buckets.mastered + buckets.learningNotMastered + buckets.neverLearning;
  const pct = (count: number) => (total > 0 ? (count / total) * 100 : 0);

  return (
    <div className="space-y-1.5">
      <div
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-base-300"
        role="img"
        aria-label={`${name}: ${buckets.mastered} mastered, ${buckets.learningNotMastered} learning, ${buckets.neverLearning} not started`}
      >
        <div className="bg-success" style={{ width: `${pct(buckets.mastered)}%` }} />
        <div className="bg-primary" style={{ width: `${pct(buckets.learningNotMastered)}%` }} />
      </div>
      <p className="text-xs text-base-content/60">
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
}: {
  collection: CollectionCardData;
  buckets?: MasteryBucketCounts;
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
          {collection.totalCount} terms
        </span>
      </div>
      {buckets ? (
        <BucketProgress buckets={buckets} name={collection.name} />
      ) : (
        <div className="space-y-1.5">
          <progress
            className="progress progress-success h-1.5 w-full"
            value={collection.percentage}
            max={100}
            aria-label={`${collection.name} mastered ${collection.percentage}%`}
          />
          <p className="text-xs text-base-content/60">
            <span className="tabular-nums">{collection.termsLearnedCount}</span>/
            <span className="tabular-nums">{collection.totalCount}</span> mastered
          </p>
        </div>
      )}
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
      buckets={collection.paceInsight.buckets}
      strengthPercent={Math.round(collection.currentStrength * 100)}
      footnote={formatUnseenFootnote(collection)}
      paceLine={formatPaceLine(collection.paceInsight)}
      onSelect={() => onSelect(collection.id)}
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
