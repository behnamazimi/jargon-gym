/** Smart-queue service — composes pick + hydrate + stats. No direct RPCs. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import type { PickContext, PickMeta, PoolStats, ScoredCandidate } from "./types";
import { pickTerms } from "./pick";
import { computePoolStats } from "./stats";
import { fetchCandidates, fetchCandidatesForUser, type ReviewScope } from "./repository";
import { hydrateTermCardsForUser, hydrateTermsAsTermCards } from "./hydrate";
import { strengthForCandidate } from "./strength";

export type { ReviewScope } from "./repository";
export { fetchTermCardForUser } from "./hydrate";

type PickReviewResult = {
  cards: TermCard[];
  pickMeta: PickMeta[];
};

type Client = SupabaseClient<Database>;

export async function pickReviewTerms(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
  limit: number,
  context: PickContext,
): Promise<PickReviewResult> {
  const candidates = await fetchCandidates(client, userId, scope, status);

  if (candidates.length === 0) return { cards: [], pickMeta: [] };

  const scored = pickTerms(candidates, limit, context);
  if (scored.length === 0) return { cards: [], pickMeta: [] };

  const now = new Date();
  const pickMeta: PickMeta[] = scored.map((s) => ({
    termId: s.termId,
    score: s.score,
    reasons: s.reasons,
    strength: strengthForCandidate(s, context, now),
  }));

  const cards = await hydrateTermsAsTermCards(
    client,
    scored.map((s) => s.termId),
  );

  return { cards, pickMeta };
}

/** Service-role pick: hydrate via get_term_card. */
export async function pickReviewTermsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
  limit: number,
  context: PickContext,
  excludeTermIds?: string[],
): Promise<PickReviewResult> {
  let candidates = await fetchCandidatesForUser(client, userId, scope, status);

  if (excludeTermIds && excludeTermIds.length > 0) {
    const excludeSet = new Set(excludeTermIds);
    candidates = candidates.filter((c) => !excludeSet.has(c.termId));
  }

  if (candidates.length === 0) return { cards: [], pickMeta: [] };

  const scored = pickTerms(candidates, limit, context);
  if (scored.length === 0) return { cards: [], pickMeta: [] };

  const now = new Date();
  const pickMeta: PickMeta[] = scored.map((s) => ({
    termId: s.termId,
    score: s.score,
    reasons: s.reasons,
    strength: strengthForCandidate(s, context, now),
  }));

  const cards = await hydrateTermCardsForUser(
    client,
    userId,
    scored.map((s) => s.termId),
  );

  return { cards, pickMeta };
}

/** Every candidate in the pool, scored and sorted — no slicing. Debug/inspection only. */
export async function listScoredCandidates(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
  context: PickContext,
): Promise<ScoredCandidate[]> {
  const candidates = await fetchCandidates(client, userId, scope, status);
  if (candidates.length === 0) return [];
  return pickTerms(candidates, candidates.length, context, { includeOwnFailSitOut: true });
}

export async function getReviewPoolStats(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
  context: PickContext,
): Promise<PoolStats> {
  const candidates = await fetchCandidates(client, userId, scope, status);
  return computePoolStats(candidates, context);
}

function poolStatsByDomain(
  candidates: import("./types").ReviewCandidate[],
  context: PickContext,
): Map<string, PoolStats> {
  const byDomain = new Map<string, import("./types").ReviewCandidate[]>();

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

export async function getReviewPoolStatsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
  context: PickContext,
): Promise<PoolStats> {
  const candidates = await fetchCandidatesForUser(client, userId, scope, status);
  return computePoolStats(candidates, context);
}

/** Every active-collection candidate for status, unsorted — callers group/aggregate themselves. */
export async function fetchActiveReviewCandidatesForUser(
  client: Client,
  userId: string,
  status: "known" | "unknown",
): Promise<import("./types").ReviewCandidate[]> {
  return fetchCandidatesForUser(client, userId, { domainIds: "all" }, status);
}

export async function getReviewPoolStatsByDomainForUser(
  client: Client,
  userId: string,
  status: "known" | "unknown",
  context: PickContext,
): Promise<Map<string, PoolStats>> {
  const candidates = await fetchCandidatesForUser(client, userId, { domainIds: "all" }, status);
  return poolStatsByDomain(candidates, context);
}
