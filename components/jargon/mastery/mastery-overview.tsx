"use client";

import type { WebStatsSnapshot } from "@/lib/jargon/collection-stats";
import { CollectionCard, PausedCollectionCard } from "./collection-card";
import { formatLifetimeTotals } from "./mastery-format";
import { MasteryPracticeActivity } from "./mastery-practice-activity";

type MasteryOverviewProps = {
  stats: WebStatsSnapshot;
  /** Lifetime, never-decreasing count of terms that have ever crossed the
   *  Learning milestone but not yet Mastered. */
  lifetimeLearningCount: number;
  /** §8 "terms learned" — high-water mark, never decreases. */
  lifetimeMasteredCount: number;
  onSelectCollection: (collectionId: string) => void;
};

/** The permanent, never-decreasing record of progress — deliberately kept
 *  apart from the per-collection cards above it, which now show live,
 *  currently-decaying counts (see CollectionCard's bucket bar). This is
 *  the one place in the app that still guarantees "this can't be taken
 *  away just because you took a break." */
function LifetimeSummary({
  lifetimeLearningCount,
  lifetimeMasteredCount,
  lifetimeTotalsLine,
}: {
  lifetimeLearningCount: number;
  lifetimeMasteredCount: number;
  lifetimeTotalsLine: string | null;
}) {
  return (
    <div className="shadow-surface space-y-1 rounded-2xl bg-base-100 p-4">
      <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">Lifetime</p>
      <p className="text-sm font-semibold text-base-content">
        Learning <span className="tabular-nums">{lifetimeLearningCount}</span> terms · Mastered{" "}
        <span className="tabular-nums">{lifetimeMasteredCount}</span> terms
      </p>
      {lifetimeTotalsLine ? (
        <p className="m-0 text-xs text-base-content/50">{lifetimeTotalsLine}</p>
      ) : null}
    </div>
  );
}

/** Per-collection breakdown leads — that's what users actually track day to
 *  day. There's no single "overall strength" number here: mastery is shown
 *  per collection instead (see CollectionCard), since blending collections
 *  at very different stages into one aggregate obscured more than it told.
 *  The one exception is the lifetime summary at the bottom, which is
 *  deliberately a single permanent number rather than a live/per-collection
 *  one — see LifetimeSummary above. */
export function MasteryOverview({
  stats,
  lifetimeLearningCount,
  lifetimeMasteredCount,
  onSelectCollection,
}: MasteryOverviewProps) {
  const hasLifetimeTotals =
    stats.lifetimeTotals.reviews +
      stats.lifetimeTotals.quizAnswers +
      stats.lifetimeTotals.termsRead >
    0;

  return (
    <div className="space-y-4">
      <MasteryPracticeActivity stats={stats} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {stats.activeCollections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            onSelect={onSelectCollection}
          />
        ))}
        {stats.pausedCollections.map((collection) => (
          <PausedCollectionCard key={collection.id} collection={collection} />
        ))}
      </div>

      <LifetimeSummary
        lifetimeLearningCount={lifetimeLearningCount}
        lifetimeMasteredCount={lifetimeMasteredCount}
        lifetimeTotalsLine={hasLifetimeTotals ? formatLifetimeTotals(stats.lifetimeTotals) : null}
      />
    </div>
  );
}
