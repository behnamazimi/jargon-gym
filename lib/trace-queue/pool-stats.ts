/** Trace-queue pool stats — aggregate counts across candidates, no ranking. */

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { computePoolStats, type PoolStats } from "./stats";
import { fetchTraceCandidates, fetchTraceCandidatesForUser, type ReviewScope } from "./repository";
import type { PickContext, TraceCandidate } from "./types";

export type { PoolStats } from "./stats";

type Client = SupabaseClient<Database>;

export async function getPoolStats(
  client: Client,
  userId: string,
  scope: ReviewScope,
  context: PickContext,
): Promise<PoolStats> {
  const candidates = await fetchTraceCandidates(client, userId, scope);
  return computePoolStats(candidates, context);
}

function poolStatsByCollection(
  candidates: TraceCandidate[],
  context: PickContext,
): Map<string, PoolStats> {
  const byCollection = new Map<string, TraceCandidate[]>();

  for (const candidate of candidates) {
    const list = byCollection.get(candidate.collectionId) ?? [];
    list.push(candidate);
    byCollection.set(candidate.collectionId, list);
  }

  const statsByCollection = new Map<string, PoolStats>();
  for (const [collectionId, collectionCandidates] of byCollection) {
    statsByCollection.set(collectionId, computePoolStats(collectionCandidates, context));
  }
  return statsByCollection;
}

export async function getPoolStatsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  context: PickContext,
): Promise<PoolStats> {
  const candidates = await fetchTraceCandidatesForUser(client, userId, scope);
  return computePoolStats(candidates, context);
}

export async function getPoolStatsByCollectionForUser(
  client: Client,
  userId: string,
  context: PickContext,
): Promise<Map<string, PoolStats>> {
  const candidates = await fetchTraceCandidatesForUser(client, userId, { collectionIds: "all" });
  return poolStatsByCollection(candidates, context);
}

/** Every active-collection candidate, unsorted — callers group/aggregate
 *  themselves (rollups, mastery). Service-role: explicit userId (Telegram). */
export const fetchActiveTraceCandidatesForUser = cache(
  async function fetchActiveTraceCandidatesForUser(
    client: Client,
    userId: string,
  ): Promise<TraceCandidate[]> {
    return fetchTraceCandidatesForUser(client, userId, { collectionIds: "all" });
  },
);

/** Session-scoped counterpart — RLS via `auth.uid()` (web). */
export const fetchActiveTraceCandidates = cache(async function fetchActiveTraceCandidates(
  client: Client,
  userId: string,
): Promise<TraceCandidate[]> {
  return fetchTraceCandidates(client, userId, { collectionIds: "all" });
});

/** Read-eligible term count per collection: the same pool Read ranks,
 *  minus terms the user marked known. */
export async function getReadEligibleCountsByCollectionForUser(
  client: Client,
  userId: string,
): Promise<Map<string, number>> {
  const candidates = await fetchTraceCandidatesForUser(client, userId, { collectionIds: "all" });
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    if (candidate.markedKnownAt) continue;
    counts.set(candidate.collectionId, (counts.get(candidate.collectionId) ?? 0) + 1);
  }
  return counts;
}
