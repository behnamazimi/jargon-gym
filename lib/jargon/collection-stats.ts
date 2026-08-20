import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveReviewDomainIds, resolveReviewDomainIdsForUser } from "@/lib/jargon/known-state";
import {
  computePoolStats,
  fetchActiveReviewCandidates,
  fetchActiveReviewCandidatesForUser,
  getReviewPoolStatsByDomainForUser,
  isSameLocalDay,
  RANKING,
  strengthForCandidate,
  type PickContext,
  type ReviewCandidate,
} from "@/lib/smart-queue";
import type { CollectionDomainRow } from "./collections";

type Client = SupabaseClient<Database>;

export type CollectionStats = {
  id: string;
  name: string;
  isActive: boolean;
  knownCount: number;
  totalCount: number;
  percentage: number;
  unknownUnseen: number;
  unknownSeen: number;
  unknownStale: number;
};

export async function fetchCollectionStats(
  client: Client,
  userId: string,
  context: PickContext = "read",
): Promise<CollectionStats[]> {
  const { collectionRows, reviewDomainIds } = await resolveReviewDomainIdsForUser(client, userId);

  if (collectionRows.length === 0) return [];

  const activeSet = new Set(reviewDomainIds);
  const unknownStatsByDomain = await getReviewPoolStatsByDomainForUser(
    client,
    userId,
    "unknown",
    context,
  );

  const stats: CollectionStats[] = collectionRows.map((row) => {
    const totalCount = row.termCount;
    const knownCount = row.knownCount;
    const percentage = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
    const queueStats = unknownStatsByDomain.get(row.id);

    return {
      id: row.id,
      name: row.name,
      isActive: activeSet.has(row.id),
      knownCount,
      totalCount,
      percentage,
      unknownUnseen: queueStats?.unseen ?? 0,
      unknownSeen: queueStats?.seen ?? 0,
      unknownStale: queueStats?.stale ?? 0,
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
  unknownNever: number;
  unknownRecent: number;
  unknownStale: number;
};

/** `/stat` (Telegram) and the web Mastery page's overview share this shape:
 *  a rollup across active collections plus a per-collection unknown-Read
 *  partition. */
export type StatsSnapshot = {
  activeCount: number;
  pausedCount: number;
  rollup: {
    read: { never: number; stale: number };
    review: { never: number; struggling: number };
    quiz: { never: number; struggling: number };
  };
  activeCollections: CollectionStatBreakdown[];
};

function groupCandidatesByDomain(candidates: ReviewCandidate[]): Map<string, ReviewCandidate[]> {
  const byDomain = new Map<string, ReviewCandidate[]>();
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
    read: { never: 0, stale: 0 },
    review: { never: 0, struggling: 0 },
    quiz: { never: 0, struggling: 0 },
  },
  activeCollections: [],
};

/** Pure aggregation shared by the Telegram and web snapshot fetchers below —
 *  two candidate fetches (unknown + known), both already scoped to active
 *  collections by `domainIds: "all"`. */
function buildStatsSnapshot(
  collectionRows: CollectionDomainRow[],
  reviewDomainIds: string[],
  unknownCandidates: ReviewCandidate[],
  knownCandidates: ReviewCandidate[],
): StatsSnapshot {
  const activeSet = new Set(reviewDomainIds);
  const activeRows = collectionRows.filter((row) => activeSet.has(row.id));
  const pausedCount = collectionRows.length - activeRows.length;

  if (activeRows.length === 0) {
    return { ...EMPTY_STATS_SNAPSHOT, pausedCount };
  }

  const unknownByDomain = groupCandidatesByDomain(unknownCandidates);
  const readPool = computePoolStats(unknownCandidates, "read");
  const reviewUnknownPool = computePoolStats(unknownCandidates, "review");
  const reviewKnownPool = computePoolStats(knownCandidates, "review");
  const quizKnownPool = computePoolStats(knownCandidates, "quiz");

  const activeCollections: CollectionStatBreakdown[] = activeRows.map((row) => {
    const totalCount = row.termCount;
    const knownCount = row.knownCount;
    const percentage = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
    const domainReadPool = computePoolStats(unknownByDomain.get(row.id) ?? [], "read");

    return {
      id: row.id,
      name: row.name,
      knownCount,
      totalCount,
      percentage,
      unknownNever: domainReadPool.unseen,
      unknownRecent: domainReadPool.recent,
      unknownStale: domainReadPool.stale,
    };
  });

  activeCollections.sort((a, b) => {
    if (a.unknownStale !== b.unknownStale) return b.unknownStale - a.unknownStale;
    if (a.unknownNever !== b.unknownNever) return b.unknownNever - a.unknownNever;
    return a.name.localeCompare(b.name);
  });

  return {
    activeCount: activeRows.length,
    pausedCount,
    rollup: {
      read: { never: readPool.unseen, stale: readPool.stale },
      review: {
        never: reviewUnknownPool.unseen,
        struggling: reviewUnknownPool.struggling + reviewKnownPool.struggling,
      },
      // Quiz is known-pool only — never/struggling reflect the known pool alone.
      quiz: {
        never: quizKnownPool.unseen,
        struggling: quizKnownPool.struggling,
      },
    },
    activeCollections,
  };
}

/** Telegram `/stat`: service-role client, explicit userId (no RLS session). */
export async function fetchTelegramStats(client: Client, userId: string): Promise<StatsSnapshot> {
  const { collectionRows, reviewDomainIds } = await resolveReviewDomainIdsForUser(client, userId);
  if (collectionRows.length === 0) return EMPTY_STATS_SNAPSHOT;

  const [unknownCandidates, knownCandidates] = await Promise.all([
    fetchActiveReviewCandidatesForUser(client, userId, "unknown"),
    fetchActiveReviewCandidatesForUser(client, userId, "known"),
  ]);

  return buildStatsSnapshot(collectionRows, reviewDomainIds, unknownCandidates, knownCandidates);
}

type MasteryTiers = { weak: number; medium: number; strong: number };

export type AccuracySummary = { passed: number; attempted: number; percentage: number };

type PausedCollectionSummary = {
  id: string;
  name: string;
  knownCount: number;
  totalCount: number;
  percentage: number;
};

/** Adds diagnostic (mastery/accuracy), momentum (today), and coverage
 *  (known% across active collections only) on top of the Telegram-shared
 *  `StatsSnapshot` — web page only, richer than a Telegram message needs to be. */
export type WebStatsSnapshot = StatsSnapshot & {
  coverage: { known: number; total: number; percentage: number };
  today: { read: number; review: number; quiz: number };
  mastery: { review: MasteryTiers; quiz: MasteryTiers };
  accuracy: { review: AccuracySummary; quiz: AccuracySummary };
  pausedCollections: PausedCollectionSummary[];
};

function computeCoverage(collectionRows: CollectionDomainRow[]) {
  const known = collectionRows.reduce((sum, row) => sum + row.knownCount, 0);
  const total = collectionRows.reduce((sum, row) => sum + row.termCount, 0);
  return { known, total, percentage: total > 0 ? Math.round((known / total) * 100) : 0 };
}

function lastActivityAtForContext(candidate: ReviewCandidate, context: PickContext): Date | null {
  switch (context) {
    case "read":
      return candidate.lastReadAt;
    case "review":
      return candidate.lastReviewRecallAt;
    case "quiz":
      return candidate.lastQuizTestedAt;
  }
}

function countActivityToday(
  candidates: ReviewCandidate[],
  context: PickContext,
  now: Date,
): number {
  return candidates.filter((candidate) => {
    const lastActivityAt = lastActivityAtForContext(candidate, context);
    return lastActivityAt !== null && isSameLocalDay(lastActivityAt, now, RANKING.timezone);
  }).length;
}

function tallyMastery(
  candidates: ReviewCandidate[],
  context: "review" | "quiz",
  now: Date,
): MasteryTiers {
  const tiers: MasteryTiers = { weak: 0, medium: 0, strong: 0 };
  for (const candidate of candidates) {
    const strength = strengthForCandidate(candidate, context, now);
    if (strength && strength !== "unverified") tiers[strength]++;
  }
  return tiers;
}

function summarizeAccuracy(
  candidates: ReviewCandidate[],
  context: "review" | "quiz",
): AccuracySummary {
  let attempted = 0;
  let failed = 0;
  for (const candidate of candidates) {
    attempted += context === "review" ? candidate.reviewRecallCount : candidate.quizTestCount;
    failed += context === "review" ? candidate.reviewFailCount : candidate.quizFailCount;
  }
  const passed = attempted - failed;
  return {
    passed,
    attempted,
    percentage: attempted > 0 ? Math.round((passed / attempted) * 100) : 0,
  };
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
  mastery: {
    review: { weak: 0, medium: 0, strong: 0 },
    quiz: { weak: 0, medium: 0, strong: 0 },
  },
  accuracy: {
    review: { passed: 0, attempted: 0, percentage: 0 },
    quiz: { passed: 0, attempted: 0, percentage: 0 },
  },
  pausedCollections: [],
};

/** Web `/jargon/mastery`: session-scoped client, RLS via `auth.uid()`. Layers
 *  diagnostic/momentum/coverage numbers on top of the shared snapshot —
 *  Telegram's `fetchTelegramStats` is untouched by this. */
export async function fetchStatsSnapshot(
  client: Client,
  userId: string,
): Promise<WebStatsSnapshot> {
  const { collectionRows, reviewDomainIds } = await resolveReviewDomainIds(client, userId);
  if (collectionRows.length === 0) return EMPTY_WEB_STATS_SNAPSHOT;

  const [unknownCandidates, knownCandidates] = await Promise.all([
    fetchActiveReviewCandidates(client, userId, "unknown"),
    fetchActiveReviewCandidates(client, userId, "known"),
  ]);

  const base = buildStatsSnapshot(
    collectionRows,
    reviewDomainIds,
    unknownCandidates,
    knownCandidates,
  );
  const now = new Date();
  const combined = [...unknownCandidates, ...knownCandidates];
  const activeSet = new Set(reviewDomainIds);
  const pausedCollections = collectionRows
    .filter((row) => !activeSet.has(row.id))
    .map(toPausedCollectionSummary)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ...base,
    coverage: computeCoverage(collectionRows.filter((row) => activeSet.has(row.id))),
    today: {
      read: countActivityToday(unknownCandidates, "read", now),
      review: countActivityToday(combined, "review", now),
      // Quiz is known-pool only.
      quiz: countActivityToday(knownCandidates, "quiz", now),
    },
    mastery: {
      review: tallyMastery(combined, "review", now),
      quiz: tallyMastery(knownCandidates, "quiz", now),
    },
    accuracy: {
      review: summarizeAccuracy(combined, "review"),
      // Lifetime accuracy, not gated on current known status — a term that
      // just flipped to unknown on a miss must still count that miss.
      quiz: summarizeAccuracy(combined, "quiz"),
    },
    pausedCollections,
  };
}
