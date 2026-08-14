import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveReviewDomainIdsForUser } from "@/lib/jargon/known-state";
import {
  computePoolStats,
  fetchActiveReviewCandidatesForUser,
  getReviewPoolStatsByDomainForUser,
  type PickContext,
  type ReviewCandidate,
} from "@/lib/smart-queue";

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

export type TelegramCollectionStats = {
  id: string;
  name: string;
  knownCount: number;
  totalCount: number;
  percentage: number;
  unknownNever: number;
  unknownRecent: number;
  unknownStale: number;
};

export type TelegramStatsSnapshot = {
  activeCount: number;
  pausedCount: number;
  rollup: {
    read: { never: number; stale: number };
    review: { never: number; struggling: number };
    quiz: { never: number; struggling: number };
  };
  activeCollections: TelegramCollectionStats[];
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

const EMPTY_TELEGRAM_STATS: TelegramStatsSnapshot = {
  activeCount: 0,
  pausedCount: 0,
  rollup: {
    read: { never: 0, stale: 0 },
    review: { never: 0, struggling: 0 },
    quiz: { never: 0, struggling: 0 },
  },
  activeCollections: [],
};

/** Telegram `/stat` snapshot: a rollup across active collections plus a
 *  per-collection unknown-Read partition. Two candidate fetches (unknown +
 *  known), both already scoped to active collections by `domainIds: "all"`. */
export async function fetchTelegramStats(
  client: Client,
  userId: string,
): Promise<TelegramStatsSnapshot> {
  const { collectionRows, reviewDomainIds } = await resolveReviewDomainIdsForUser(client, userId);
  if (collectionRows.length === 0) return EMPTY_TELEGRAM_STATS;

  const activeSet = new Set(reviewDomainIds);
  const activeRows = collectionRows.filter((row) => activeSet.has(row.id));
  const pausedCount = collectionRows.length - activeRows.length;

  if (activeRows.length === 0) {
    return { ...EMPTY_TELEGRAM_STATS, pausedCount };
  }

  const [unknownCandidates, knownCandidates] = await Promise.all([
    fetchActiveReviewCandidatesForUser(client, userId, "unknown"),
    fetchActiveReviewCandidatesForUser(client, userId, "known"),
  ]);

  const unknownByDomain = groupCandidatesByDomain(unknownCandidates);
  const readPool = computePoolStats(unknownCandidates, "read");
  const reviewUnknownPool = computePoolStats(unknownCandidates, "review");
  const quizUnknownPool = computePoolStats(unknownCandidates, "quiz");
  const reviewKnownPool = computePoolStats(knownCandidates, "review");
  const quizKnownPool = computePoolStats(knownCandidates, "quiz");

  const activeCollections: TelegramCollectionStats[] = activeRows.map((row) => {
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
      quiz: {
        never: quizUnknownPool.unseen,
        struggling: quizUnknownPool.struggling + quizKnownPool.struggling,
      },
    },
    activeCollections,
  };
}
