"use client";

import type { WebStatsSnapshot } from "@/lib/jargon/collection-stats";
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
  lifetimeTotalsLine,
}: {
  termsLearning: number;
  termsLearned: number;
  activeCount: number;
  pausedCount: number;
  lifetimeTotalsLine: string | null;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-base-content">
          Learning <span className="tabular-nums">{termsLearning}</span> terms · Mastered{" "}
          <span className="tabular-nums">{termsLearned}</span> terms
        </p>
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-base-content/50">
          {activeCount} active · {pausedCount} paused
        </span>
      </div>
      {lifetimeTotalsLine ? (
        <p className="m-0 text-xs text-base-content/50">{lifetimeTotalsLine}</p>
      ) : null}
    </div>
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

  return (
    <div className="space-y-4">
      <OverviewHeader
        termsLearning={termsLearning}
        termsLearned={termsLearned}
        activeCount={stats.activeCount}
        pausedCount={stats.pausedCount}
        lifetimeTotalsLine={hasLifetimeTotals ? formatLifetimeTotals(stats.lifetimeTotals) : null}
      />

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
    </div>
  );
}
