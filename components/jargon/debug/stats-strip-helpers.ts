import type { DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
import type { PickContext } from "@/lib/trace-queue";
import type { StudyCollection } from "@/lib/study/types";

export type QueueStats = {
  total: number;
  known: number;
  learning: number;
  unknown: number;
  /** Untested in whichever track the selected context ranks by — read
   *  count for Read, recall for Review, recognition for Quiz. */
  untestedInTrack: number;
  attentionFlagged: number;
};

function untestedInTrack(row: DebugScoredRow, context: PickContext): boolean {
  if (context === "read") return row.readCount === 0;
  if (context === "review") return row.recallStability === null;
  return row.quizKnowledgePosterior === null;
}

/** Shared by computeQueueStats and computeCollectionBreakdown so "flagged"
 *  has exactly one definition instead of two that could drift. */
function isFlagged(row: DebugScoredRow): boolean {
  return row.attentionFlags.length > 0 || row.crossTrackFlag !== null;
}

export function computeQueueStats(rows: DebugScoredRow[], context: PickContext): QueueStats {
  const stats: QueueStats = {
    total: rows.length,
    known: 0,
    learning: 0,
    unknown: 0,
    untestedInTrack: 0,
    attentionFlagged: 0,
  };

  for (const row of rows) {
    stats[row.knownLabel] += 1;
    if (untestedInTrack(row, context)) stats.untestedInTrack += 1;
    if (isFlagged(row)) stats.attentionFlagged += 1;
  }

  return stats;
}

export type CollectionStat = {
  domainId: string;
  name: string;
  total: number;
  known: number;
  learning: number;
  unknown: number;
  flagged: number;
};

/** Pool-wide StatsStrip/RetrievabilityDistributionBar answer "how is
 *  everything doing"; this answers "which collection is lagging" — grouped
 *  by domainId instead of collapsed across it. Collections with no rows in
 *  the current selection are dropped rather than shown at zero. */
export function computeCollectionBreakdown(
  rows: DebugScoredRow[],
  collections: StudyCollection[],
): CollectionStat[] {
  const byDomain = new Map<string, CollectionStat>(
    collections.map((collection) => [
      collection.id,
      {
        domainId: collection.id,
        name: collection.name,
        total: 0,
        known: 0,
        learning: 0,
        unknown: 0,
        flagged: 0,
      },
    ]),
  );

  for (const row of rows) {
    const stat = byDomain.get(row.domainId);
    if (!stat) continue;
    stat.total += 1;
    stat[row.knownLabel] += 1;
    if (isFlagged(row)) stat.flagged += 1;
  }

  return [...byDomain.values()].filter((stat) => stat.total > 0);
}
