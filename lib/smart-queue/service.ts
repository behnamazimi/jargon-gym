/** Smart-queue service — composes pick + hydrate + stats. No direct RPCs. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import type { PickContext, PickMeta, PoolStats } from "./types";
import { pickTerms } from "./pick";
import { computePoolStats } from "./stats";
import {
  fetchCandidates,
  fetchCandidatesForUser,
  loadUserPreset,
  type ReviewScope,
} from "./repository";
import { hydrateTermCardsForUser, hydrateTermsAsTermCards } from "./hydrate";

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
  context: PickContext = "default",
): Promise<PickReviewResult> {
  const [candidates, preset] = await Promise.all([
    fetchCandidates(client, userId, scope, status),
    loadUserPreset(client, userId),
  ]);

  if (candidates.length === 0) return { cards: [], pickMeta: [] };

  const scored = pickTerms(candidates, preset, limit, context);
  if (scored.length === 0) return { cards: [], pickMeta: [] };

  const pickMeta: PickMeta[] = scored.map((s) => ({
    termId: s.termId,
    score: s.score,
    reasons: s.reasons,
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
  context: PickContext = "default",
): Promise<PickReviewResult> {
  const [candidates, preset] = await Promise.all([
    fetchCandidatesForUser(client, userId, scope, status),
    loadUserPreset(client, userId),
  ]);

  if (candidates.length === 0) return { cards: [], pickMeta: [] };

  const scored = pickTerms(candidates, preset, limit, context);
  if (scored.length === 0) return { cards: [], pickMeta: [] };

  const pickMeta: PickMeta[] = scored.map((s) => ({
    termId: s.termId,
    score: s.score,
    reasons: s.reasons,
  }));

  const cards = await hydrateTermCardsForUser(
    client,
    userId,
    scored.map((s) => s.termId),
  );

  return { cards, pickMeta };
}

export async function getReviewPoolStats(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
): Promise<PoolStats> {
  const candidates = await fetchCandidates(client, userId, scope, status);
  return computePoolStats(candidates);
}

function poolStatsByDomain(
  candidates: import("./types").ReviewCandidate[],
): Map<string, PoolStats> {
  const byDomain = new Map<string, import("./types").ReviewCandidate[]>();

  for (const candidate of candidates) {
    const list = byDomain.get(candidate.domainId) ?? [];
    list.push(candidate);
    byDomain.set(candidate.domainId, list);
  }

  const statsByDomain = new Map<string, PoolStats>();
  for (const [domainId, domainCandidates] of byDomain) {
    statsByDomain.set(domainId, computePoolStats(domainCandidates));
  }
  return statsByDomain;
}

export async function getReviewPoolStatsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
): Promise<PoolStats> {
  const candidates = await fetchCandidatesForUser(client, userId, scope, status);
  return computePoolStats(candidates);
}

export async function getReviewPoolStatsByDomainForUser(
  client: Client,
  userId: string,
  status: "known" | "unknown",
): Promise<Map<string, PoolStats>> {
  const candidates = await fetchCandidatesForUser(client, userId, { domainIds: "all" }, status);
  return poolStatsByDomain(candidates);
}
