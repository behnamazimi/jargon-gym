"use client";

import { ChevronRight, PauseCircle } from "lucide-react";
import { useState } from "react";
import type { WebStatsSnapshot } from "@/lib/jargon/collection-stats";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/jargon/empty-state";
import { cn } from "@/lib/utils";
import { CollectionCard, PausedCollectionCard } from "./collection-card";
import { formatLifetimeTotals } from "./mastery-format";
import { MasteryPracticeActivity } from "./mastery-practice-activity";

type MasteryOverviewProps = {
  stats: WebStatsSnapshot;
  /** Ever crossed Learning, not yet Mastered — permanent bucket count. */
  termsLearning: number;
  /** §8 "terms learned" — high-water mark, never decreases. */
  termsLearned: number;
  onSelectCollection: (collectionId: string) => void;
};

function OverviewHeader({
  termsLearning,
  termsLearned,
  activeCount,
  pausedCount,
}: {
  termsLearning: number;
  termsLearned: number;
  activeCount: number;
  pausedCount: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-sm font-semibold text-base-content">
        Learning <span className="tabular-nums">{termsLearning}</span> terms · Mastered{" "}
        <span className="tabular-nums">{termsLearned}</span> terms
      </p>
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-base-content/50">
        {activeCount} active · {pausedCount} paused
      </span>
    </div>
  );
}

function PausedCollections({
  collections,
}: {
  collections: WebStatsSnapshot["pausedCollections"];
}) {
  const [open, setOpen] = useState(false);
  if (collections.length === 0) return null;

  return (
    <Collapsible
      isExpanded={open}
      onExpandedChange={setOpen}
      className="shadow-surface rounded-2xl bg-base-100 p-4"
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border-none bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <span className="text-sm font-semibold text-base-content">
          Show paused ({collections.length})
        </span>
        <ChevronRight
          className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")}
          aria-hidden
          strokeWidth={2}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {collections.map((collection) => (
            <PausedCollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Per-collection breakdown leads — that's what users actually track day to
 *  day. There's no single "overall strength" number here: mastery is shown
 *  per collection instead (see CollectionCard), since blending collections
 *  at very different stages into one aggregate obscured more than it told. */
export function MasteryOverview({
  stats,
  termsLearning,
  termsLearned,
  onSelectCollection,
}: MasteryOverviewProps) {
  const hasLifetimeTotals =
    stats.lifetimeTotals.reviews +
      stats.lifetimeTotals.quizAnswers +
      stats.lifetimeTotals.termsRead >
    0;
  const hasNoActiveCollections = stats.activeCollections.length === 0;

  return (
    <div className="space-y-4">
      <OverviewHeader
        termsLearning={termsLearning}
        termsLearned={termsLearned}
        activeCount={stats.activeCount}
        pausedCount={stats.pausedCount}
      />

      {hasNoActiveCollections ? (
        stats.pausedCollections.length > 0 ? (
          <div className="shadow-surface rounded-2xl bg-base-100 p-6">
            <EmptyState
              icon={PauseCircle}
              titleAs="h2"
              title="No active collections"
              description="Resume a paused collection below, or import new terms to start building mastery."
            />
          </div>
        ) : null
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stats.activeCollections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onSelect={onSelectCollection}
            />
          ))}
        </div>
      )}

      <PausedCollections collections={stats.pausedCollections} />

      <MasteryPracticeActivity stats={stats} />

      {hasLifetimeTotals ? (
        <p className="m-0 text-xs text-base-content/50">
          {formatLifetimeTotals(stats.lifetimeTotals)}
        </p>
      ) : null}
    </div>
  );
}
