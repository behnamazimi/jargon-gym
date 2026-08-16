"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import type {
  AccuracySummary,
  CollectionStatBreakdown,
  WebStatsSnapshot,
} from "@/lib/jargon/collection-stats";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function formatBucketLine(buckets: Array<[word: string, count: number]>): string {
  const nonZero = buckets.filter(([, count]) => count > 0);
  if (nonZero.length === 0) return "None waiting";
  return nonZero.map(([word, count]) => `${count} ${word}`).join(" · ");
}

function formatUnknownFootnote(collection: CollectionStatBreakdown): string {
  const total = collection.unknownNever + collection.unknownRecent + collection.unknownStale;
  return `${total} unknown: ${collection.unknownNever} never · ${collection.unknownRecent} recent · ${collection.unknownStale} stale`;
}

function formatAccuracy(accuracy: AccuracySummary): string {
  if (accuracy.attempted === 0) return "no attempts yet";
  return `${accuracy.percentage}% recall (${accuracy.passed}/${accuracy.attempted})`;
}

function RollupRow({
  label,
  buckets,
  today,
}: {
  label: string;
  buckets: Array<[string, number]>;
  today: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="font-medium text-base-content">{label}</span>
      <span className="text-base-content/60">
        {formatBucketLine(buckets)} · {today} today
      </span>
    </div>
  );
}

type CollectionProgress = {
  id: string;
  name: string;
  knownCount: number;
  totalCount: number;
  percentage: number;
};

/** A single collection's progress as a flat row — no card-in-card nesting,
 *  just a divider between entries in the list it's rendered inside. */
function CollectionRow({
  collection,
  footnote,
  muted,
}: {
  collection: CollectionProgress;
  footnote?: string;
  muted?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5 py-2.5", muted && "opacity-60")}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-base-content">{collection.name}</span>
        <span className="shrink-0 tabular-nums text-base-content/60">
          {collection.knownCount}/{collection.totalCount} known
        </span>
      </div>
      <progress
        className="progress progress-primary h-1.5 w-full"
        value={collection.percentage}
        max={100}
        aria-label={`${collection.name} known ${collection.percentage}%`}
      />
      {footnote ? <p className="text-xs text-base-content/50">{footnote}</p> : null}
    </div>
  );
}

type MasteryOverviewProps = {
  stats: WebStatsSnapshot;
};

/** Collapsed by default so the mastery list stays the focus — expand for
 *  what's stale/struggling/waiting and the per-collection breakdown. */
export function MasteryOverview({ stats }: MasteryOverviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      isExpanded={open}
      onExpandedChange={setOpen}
      className="shadow-surface rounded-2xl bg-base-100 p-4"
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-baseline justify-between gap-3 rounded-lg border-none bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-base-content">
            {stats.coverage.known}/{stats.coverage.total} known ({stats.coverage.percentage}%)
          </p>
          <p className="mt-0.5 text-xs text-base-content/50">
            Review: {formatAccuracy(stats.accuracy.review)} · Quiz:{" "}
            {formatAccuracy(stats.accuracy.quiz)}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium uppercase tracking-wide text-base-content/50">
          <span>
            {stats.activeCount} active · {stats.pausedCount} paused
          </span>
          <ChevronRight
            className={cn("size-3.5 transition-transform", open && "rotate-90")}
            aria-hidden
            strokeWidth={2}
          />
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 space-y-4">
          {stats.activeCollections.length > 0 ? (
            <div className="divide-y divide-base-content/10">
              <RollupRow
                label="Read"
                buckets={[
                  ["never", stats.rollup.read.never],
                  ["stale", stats.rollup.read.stale],
                ]}
                today={stats.today.read}
              />
              <RollupRow
                label="Review"
                buckets={[
                  ["never", stats.rollup.review.never],
                  ["struggling", stats.rollup.review.struggling],
                ]}
                today={stats.today.review}
              />
              <RollupRow
                label="Quiz"
                buckets={[
                  ["never", stats.rollup.quiz.never],
                  ["struggling", stats.rollup.quiz.struggling],
                ]}
                today={stats.today.quiz}
              />
            </div>
          ) : null}

          {stats.activeCollections.length > 0 ? (
            <div className="divide-y divide-base-content/10">
              {stats.activeCollections.map((collection) => (
                <CollectionRow
                  key={collection.id}
                  collection={collection}
                  footnote={formatUnknownFootnote(collection)}
                />
              ))}
            </div>
          ) : null}

          {stats.pausedCollections.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">
                Paused
              </p>
              <div className="divide-y divide-base-content/10">
                {stats.pausedCollections.map((collection) => (
                  <CollectionRow key={collection.id} collection={collection} muted />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
