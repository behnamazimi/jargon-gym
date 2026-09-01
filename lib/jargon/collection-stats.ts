import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveReviewDomainIds, resolveReviewDomainIdsForUser } from "@/lib/jargon/known-state";
import {
  fetchActiveTraceCandidates,
  getPoolStatsByDomainForUser,
  type PickContext,
  type TraceCandidate,
} from "@/lib/trace-queue";
import { isSameLocalDay, STUDY_TIMEZONE } from "@/lib/trace";
import type { CollectionDomainRow } from "./collections";

type Client = SupabaseClient<Database>;

export type CollectionStats = {
  id: string;
  name: string;
  isActive: boolean;
  knownCount: number;
  totalCount: number;
  percentage: number;
  unseen: number;
  seen: number;
};

export async function fetchCollectionStats(
  client: Client,
  userId: string,
  context: PickContext = "read",
): Promise<CollectionStats[]> {
  const { collectionRows, reviewDomainIds } = await resolveReviewDomainIdsForUser(client, userId);

  if (collectionRows.length === 0) return [];

  const activeSet = new Set(reviewDomainIds);
  const statsByDomain = await getPoolStatsByDomainForUser(client, userId, context);

  const stats: CollectionStats[] = collectionRows.map((row) => {
    const totalCount = row.termCount;
    const knownCount = row.knownCount;
    const percentage = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
    const queueStats = statsByDomain.get(row.id);

    return {
      id: row.id,
      name: row.name,
      isActive: activeSet.has(row.id),
      knownCount,
      totalCount,
      percentage,
      unseen: queueStats?.unseen ?? 0,
      seen: queueStats?.seen ?? 0,
    };
  });

  stats.sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return stats;
}

export type CollectionStatBreakdown = {
  id: string;
  name: string;
  knownCount: number;
  totalCount: number;
  percentage: number;
  unseenCount: number;
};

/** The web Mastery page's overview: a rollup across active collections
 *  plus a per-collection unseen count. */
type StatsSnapshot = {
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

const EMPTY_STATS_SNAPSHOT: StatsSnapshot = {
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
function buildStatsSnapshot(
  collectionRows: CollectionDomainRow[],
  reviewDomainIds: string[],
  candidates: TraceCandidate[],
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
    const knownCount = row.knownCount;
    const percentage = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;

    return {
      id: row.id,
      name: row.name,
      knownCount,
      totalCount,
      percentage,
      unseenCount: countUnseen(byDomain.get(row.id) ?? [], "read"),
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

type PausedCollectionSummary = {
  id: string;
  name: string;
  knownCount: number;
  totalCount: number;
  percentage: number;
};

/** Adds momentum (today) and coverage (known% across active collections
 *  only) on top of the base `StatsSnapshot`.
 *
 *  No lifetime accuracy here: the old pass/fail counters that backed it
 *  were retired with the streak-based scoring signals (deprecated, no
 *  longer written by record_review_event). TRACE's live retrievability is
 *  the closer analogue and is what the Mastery page's headline numbers use
 *  instead (see lib/jargon/mastery.ts). */
export type WebStatsSnapshot = StatsSnapshot & {
  coverage: { known: number; total: number; percentage: number };
  today: { read: number; review: number; quiz: number };
  pausedCollections: PausedCollectionSummary[];
};

function computeCoverage(collectionRows: CollectionDomainRow[]) {
  const known = collectionRows.reduce((sum, row) => sum + row.knownCount, 0);
  const total = collectionRows.reduce((sum, row) => sum + row.termCount, 0);
  return { known, total, percentage: total > 0 ? Math.round((known / total) * 100) : 0 };
}

function lastActivityAtForContext(candidate: TraceCandidate, context: PickContext): Date | null {
  switch (context) {
    case "read":
      return candidate.lastReadAt;
    case "review":
      return candidate.lastReviewRecallAt;
    case "quiz":
      return candidate.lastQuizTestedAt;
  }
}

function countActivityToday(candidates: TraceCandidate[], context: PickContext, now: Date): number {
  return candidates.filter((candidate) => {
    const lastActivityAt = lastActivityAtForContext(candidate, context);
    return lastActivityAt !== null && isSameLocalDay(lastActivityAt, now, STUDY_TIMEZONE);
  }).length;
}

function toPausedCollectionSummary(row: CollectionDomainRow): PausedCollectionSummary {
  const totalCount = row.termCount;
  const knownCount = row.knownCount;
  const percentage = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
  return { id: row.id, name: row.name, knownCount, totalCount, percentage };
}

const EMPTY_WEB_STATS_SNAPSHOT: WebStatsSnapshot = {
  ...EMPTY_STATS_SNAPSHOT,
  coverage: { known: 0, total: 0, percentage: 0 },
  today: { read: 0, review: 0, quiz: 0 },
  pausedCollections: [],
};

/** Web `/jargon/mastery`: session-scoped client, RLS via `auth.uid()`. Layers
 *  accuracy/momentum/coverage numbers on top of the base snapshot. */
export async function fetchStatsSnapshot(
  client: Client,
  userId: string,
): Promise<WebStatsSnapshot> {
  const { collectionRows, reviewDomainIds } = await resolveReviewDomainIds(client, userId);
  if (collectionRows.length === 0) return EMPTY_WEB_STATS_SNAPSHOT;

  const candidates = await fetchActiveTraceCandidates(client, userId);

  const base = buildStatsSnapshot(collectionRows, reviewDomainIds, candidates);
  const now = new Date();
  const activeSet = new Set(reviewDomainIds);
  const pausedCollections = collectionRows
    .filter((row) => !activeSet.has(row.id))
    .map(toPausedCollectionSummary)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ...base,
    coverage: computeCoverage(collectionRows.filter((row) => activeSet.has(row.id))),
    today: {
      read: countActivityToday(candidates, "read", now),
      review: countActivityToday(candidates, "review", now),
      quiz: countActivityToday(candidates, "quiz", now),
    },
    pausedCollections,
  };
}
