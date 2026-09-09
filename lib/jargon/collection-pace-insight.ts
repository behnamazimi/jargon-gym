import type { TraceCandidate, PickContext } from "@/lib/trace-queue";
import {
  aggregateMastery,
  computeCrossingPace,
  estimateMilestone,
  partitionMasteryBuckets,
  type MasteryBucketCounts,
  type MilestoneEstimate,
} from "@/lib/trace";
import type { CollectionDomainRow } from "./collections";

/** Rough "time to next milestone" insight, per collection — two
 *  independent estimates (never combined into one number, since the two
 *  transitions compete for the same study time), anchored on the
 *  permanent ever_learning_at/ever_mastered_at high-water marks rather
 *  than the live, decaying mastery label. See lib/trace/pace.ts. */
export type CollectionPaceInsight = {
  buckets: MasteryBucketCounts;
  /** Time until the last "never reached Learning" term first gets there. */
  toLearning: MilestoneEstimate;
  /** Time until the current "reached Learning, not yet Mastered" terms clear. */
  toMastery: MilestoneEstimate;
};

export type CollectionStatBreakdown = {
  id: string;
  name: string;
  termsLearnedCount: number;
  /** How many of termsLearnedCount the user manually marked known, rather
   *  than earning through TRACE — the Mastery page's "N marked known by
   *  you" line. */
  markedKnownCount: number;
  totalCount: number;
  percentage: number;
  unseenCount: number;
  paceInsight: CollectionPaceInsight;
  /** §8 OverallMastery scoped to this collection's own started (≥1 Read)
   *  terms — the per-collection analogue of the page-wide aggregate, which
   *  blurred together collections at very different stages. */
  currentStrength: number;
};

/** The web Mastery page's overview: a rollup across active collections
 *  plus a per-collection unseen count. */
export type StatsSnapshot = {
  activeCount: number;
  pausedCount: number;
  rollup: {
    read: { unseen: number };
    review: { unseen: number };
    quiz: { unseen: number };
  };
  activeCollections: CollectionStatBreakdown[];
};

function groupCandidatesByDomain(candidates: TraceCandidate[]): Map<string, TraceCandidate[]> {
  const byDomain = new Map<string, TraceCandidate[]>();
  for (const candidate of candidates) {
    const list = byDomain.get(candidate.domainId) ?? [];
    list.push(candidate);
    byDomain.set(candidate.domainId, list);
  }
  return byDomain;
}

export const EMPTY_STATS_SNAPSHOT: StatsSnapshot = {
  activeCount: 0,
  pausedCount: 0,
  rollup: {
    read: { unseen: 0 },
    review: { unseen: 0 },
    quiz: { unseen: 0 },
  },
  activeCollections: [],
};

function countUnseen(candidates: TraceCandidate[], context: PickContext): number {
  const ownCount = (c: TraceCandidate) =>
    context === "read" ? c.readCount : context === "review" ? c.reviewRecallCount : c.quizTestCount;
  return candidates.filter((c) => ownCount(c) === 0).length;
}

/** Pure aggregation for the web snapshot fetcher below — one candidate
 *  fetch across all active collections (`domainIds: "all"`). */
function buildCollectionPaceInsight(
  candidates: TraceCandidate[],
  now: Date,
): CollectionPaceInsight {
  // Manually-marked-known terms have no earned journey — leave them out so
  // they don't inflate "never learning" or skew the crossing-rate math.
  const earnedCandidates = candidates.filter((c) => !c.markedKnownAt);
  const buckets = partitionMasteryBuckets(earnedCandidates);
  const learningCrossings = earnedCandidates
    .map((c) => c.everLearningAt)
    .filter((d): d is Date => d !== null);
  const masteredCrossings = earnedCandidates
    .map((c) => c.everMasteredAt)
    .filter((d): d is Date => d !== null);

  return {
    buckets,
    toLearning: estimateMilestone(
      buckets.neverLearning,
      computeCrossingPace(learningCrossings, now),
    ),
    toMastery: estimateMilestone(
      buckets.learningNotMastered,
      computeCrossingPace(masteredCrossings, now),
    ),
  };
}

export function buildStatsSnapshot(
  collectionRows: CollectionDomainRow[],
  reviewDomainIds: string[],
  candidates: TraceCandidate[],
  now: Date,
): StatsSnapshot {
  const activeSet = new Set(reviewDomainIds);
  const activeRows = collectionRows.filter((row) => activeSet.has(row.id));
  const pausedCount = collectionRows.length - activeRows.length;

  if (activeRows.length === 0) {
    return { ...EMPTY_STATS_SNAPSHOT, pausedCount };
  }

  const byDomain = groupCandidatesByDomain(candidates);

  const activeCollections: CollectionStatBreakdown[] = activeRows.map((row) => {
    const totalCount = row.termCount;
    const termsLearnedCount = row.termsLearnedCount;
    const percentage = totalCount > 0 ? Math.round((termsLearnedCount / totalCount) * 100) : 0;
    const domainCandidates = byDomain.get(row.id) ?? [];
    const startedDomainCandidates = domainCandidates.filter((c) => c.readCount > 0);

    return {
      id: row.id,
      name: row.name,
      termsLearnedCount,
      markedKnownCount: row.markedKnownCount,
      totalCount,
      percentage,
      unseenCount: countUnseen(domainCandidates, "read"),
      paceInsight: buildCollectionPaceInsight(domainCandidates, now),
      currentStrength: aggregateMastery(startedDomainCandidates, now),
    };
  });

  activeCollections.sort((a, b) => {
    if (a.unseenCount !== b.unseenCount) return b.unseenCount - a.unseenCount;
    return a.name.localeCompare(b.name);
  });

  return {
    activeCount: activeRows.length,
    pausedCount,
    rollup: {
      read: { unseen: countUnseen(candidates, "read") },
      review: { unseen: countUnseen(candidates, "review") },
      quiz: { unseen: countUnseen(candidates, "quiz") },
    },
    activeCollections,
  };
}
