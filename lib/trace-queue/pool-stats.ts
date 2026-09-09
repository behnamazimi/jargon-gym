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

function poolStatsByDomain(
  candidates: TraceCandidate[],
  context: PickContext,
): Map<string, PoolStats> {
  const byDomain = new Map<string, TraceCandidate[]>();

  for (const candidate of candidates) {
    const list = byDomain.get(candidate.domainId) ?? [];
    list.push(candidate);
    byDomain.set(candidate.domainId, list);
  }

  const statsByDomain = new Map<string, PoolStats>();
  for (const [domainId, domainCandidates] of byDomain) {
    statsByDomain.set(domainId, computePoolStats(domainCandidates, context));
  }
  return statsByDomain;
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

export async function getPoolStatsByDomainForUser(
  client: Client,
  userId: string,
  context: PickContext,
): Promise<Map<string, PoolStats>> {
  const candidates = await fetchTraceCandidatesForUser(client, userId, { domainIds: "all" });
  return poolStatsByDomain(candidates, context);
}

/** Every active-domain candidate, unsorted — callers group/aggregate
 *  themselves (rollups, mastery). Service-role: explicit userId (Telegram). */
export const fetchActiveTraceCandidatesForUser = cache(
  async function fetchActiveTraceCandidatesForUser(
    client: Client,
    userId: string,
  ): Promise<TraceCandidate[]> {
    return fetchTraceCandidatesForUser(client, userId, { domainIds: "all" });
  },
);

/** Session-scoped counterpart — RLS via `auth.uid()` (web). */
export const fetchActiveTraceCandidates = cache(async function fetchActiveTraceCandidates(
  client: Client,
  userId: string,
): Promise<TraceCandidate[]> {
  return fetchTraceCandidates(client, userId, { domainIds: "all" });
});
