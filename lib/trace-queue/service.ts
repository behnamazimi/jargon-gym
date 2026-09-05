/** Trace-queue service — composes fetch + rank + hydrate. No direct RPCs. */

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import { rankQuizQueue, rankReadQueue, rankReviewQueue } from "@/lib/trace";
import { computePoolStats, type PoolStats } from "./stats";
import { fetchTraceCandidates, fetchTraceCandidatesForUser, type ReviewScope } from "./repository";
import { hydrateTermCardsForUser, hydrateTermsAsTermCards } from "./hydrate";
import type { PickContext, TraceCandidate } from "./types";

export type { ReviewScope } from "./repository";
export { fetchTermCardForUser } from "./hydrate";
export type { PoolStats } from "./stats";

type Client = SupabaseClient<Database>;

function excludeTerms(candidates: TraceCandidate[], excludeTermIds?: string[]): TraceCandidate[] {
  if (!excludeTermIds || excludeTermIds.length === 0) return candidates;
  const excludeSet = new Set(excludeTermIds);
  return candidates.filter((c) => !excludeSet.has(c.termId));
}

/** Read: single ranked pool, lowest exposure first. */
export async function pickReadTerms(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
): Promise<TermCard[]> {
  const candidates = await fetchTraceCandidates(client, userId, scope);
  if (candidates.length === 0) return [];

  const ranked = rankReadQueue(candidates, new Date()).slice(0, limit);
  if (ranked.length === 0) return [];

  return hydrateTermsAsTermCards(
    client,
    ranked.map((c) => c.termId),
  );
}

/** Service-role counterpart of {@link pickReadTerms} (Telegram, widget). */
export async function pickReadTermsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
  excludeTermIds?: string[],
): Promise<TermCard[]> {
  const candidates = excludeTerms(
    await fetchTraceCandidatesForUser(client, userId, scope),
    excludeTermIds,
  );
  if (candidates.length === 0) return [];

  const ranked = rankReadQueue(candidates, new Date()).slice(0, limit);
  if (ranked.length === 0) return [];

  return hydrateTermCardsForUser(
    client,
    userId,
    ranked.map((c) => c.termId),
  );
}

/** Review: every term is eligible, ranked by R_r(t) ascending — most at
 *  risk of forgetting first. Terms with no recall history yet rank first
 *  (§4b) rather than being excluded, so they can receive their first grade. */
export async function pickReviewTerms(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
): Promise<TermCard[]> {
  const candidates = await fetchTraceCandidates(client, userId, scope);
  if (candidates.length === 0) return [];

  const ranked = rankReviewQueue(candidates, new Date()).slice(0, limit);
  if (ranked.length === 0) return [];

  return hydrateTermsAsTermCards(
    client,
    ranked.map((c) => c.termId),
  );
}

/** Service-role counterpart of {@link pickReviewTerms} (Telegram). */
export async function pickReviewTermsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
  excludeTermIds?: string[],
): Promise<TermCard[]> {
  const candidates = excludeTerms(
    await fetchTraceCandidatesForUser(client, userId, scope),
    excludeTermIds,
  );
  if (candidates.length === 0) return [];

  const ranked = rankReviewQueue(candidates, new Date()).slice(0, limit);
  if (ranked.length === 0) return [];

  return hydrateTermCardsForUser(
    client,
    userId,
    ranked.map((c) => c.termId),
  );
}

/** Quiz: ranked by R_g(t) ascending, same shape as Review — terms with no
 *  quiz history yet rank first (§5) rather than being excluded. */
export async function pickQuizTerms(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
): Promise<TermCard[]> {
  const candidates = await fetchTraceCandidates(client, userId, scope);
  if (candidates.length === 0) return [];

  const ranked = rankQuizQueue(candidates, new Date()).slice(0, limit);
  if (ranked.length === 0) return [];

  return hydrateTermsAsTermCards(
    client,
    ranked.map((c) => c.termId),
  );
}

/** Service-role counterpart of {@link pickQuizTerms} (Telegram). */
export async function pickQuizTermsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
  excludeTermIds?: string[],
): Promise<TermCard[]> {
  const candidates = excludeTerms(
    await fetchTraceCandidatesForUser(client, userId, scope),
    excludeTermIds,
  );
  if (candidates.length === 0) return [];

  const ranked = rankQuizQueue(candidates, new Date()).slice(0, limit);
  if (ranked.length === 0) return [];

  return hydrateTermCardsForUser(
    client,
    userId,
    ranked.map((c) => c.termId),
  );
}

/** Every candidate in scope, unsorted — debug/inspection only. */
export async function listTraceCandidates(
  client: Client,
  userId: string,
  scope: ReviewScope,
): Promise<TraceCandidate[]> {
  return fetchTraceCandidates(client, userId, scope);
}

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
