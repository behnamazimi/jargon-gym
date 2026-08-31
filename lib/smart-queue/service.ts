/** Smart-queue service — composes pick + hydrate + stats. No direct RPCs. */

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import type { PickMeta, PoolStats } from "./types";
import {
  originOf,
  pickMixedReviewTerms as mixReviewCandidates,
  pickQuizTerms,
  pickStaleKnownTerms,
  pickTerms,
} from "./pick";
import { computePoolStats } from "./stats";
import { fetchCandidates, fetchCandidatesForUser, type ReviewScope } from "./repository";
import { hydrateTermCardsForUser, hydrateTermsAsTermCards } from "./hydrate";

export type { ReviewScope } from "./repository";
export { fetchTermCardForUser } from "./hydrate";

type PickReviewResult = {
  cards: TermCard[];
  pickMeta: PickMeta[];
};

type Client = SupabaseClient<Database>;

/** General single-pool pick — used by Read (always "unknown") and, via the
 *  Review-only wrappers below, as a building block for the blended pool. */
export async function pickReviewTerms(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
  limit: number,
): Promise<PickReviewResult> {
  const candidates = await fetchCandidates(client, userId, scope, status);

  if (candidates.length === 0) return { cards: [], pickMeta: [] };

  const picked = pickTerms(candidates, limit);
  if (picked.length === 0) return { cards: [], pickMeta: [] };

  const pickMeta: PickMeta[] = picked.map((p) => ({ termId: p.termId }));

  const cards = await hydrateTermsAsTermCards(
    client,
    picked.map((p) => p.termId),
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
  excludeTermIds?: string[],
): Promise<PickReviewResult> {
  let candidates = await fetchCandidatesForUser(client, userId, scope, status);

  if (excludeTermIds && excludeTermIds.length > 0) {
    const excludeSet = new Set(excludeTermIds);
    candidates = candidates.filter((c) => !excludeSet.has(c.termId));
  }

  if (candidates.length === 0) return { cards: [], pickMeta: [] };

  const picked = pickTerms(candidates, limit);
  if (picked.length === 0) return { cards: [], pickMeta: [] };

  const pickMeta: PickMeta[] = picked.map((p) => ({ termId: p.termId }));

  const cards = await hydrateTermCardsForUser(
    client,
    userId,
    picked.map((p) => p.termId),
  );

  return { cards, pickMeta };
}

/** Review's blended pick: fetches both pools and samples uniformly across
 *  them. No status param — Review no longer has a pure-pool mode. */
export async function pickMixedReviewTerms(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
): Promise<PickReviewResult> {
  const [unknown, known] = await Promise.all([
    fetchCandidates(client, userId, scope, "unknown"),
    fetchCandidates(client, userId, scope, "known"),
  ]);

  if (unknown.length === 0 && known.length === 0) return { cards: [], pickMeta: [] };

  const picked = mixReviewCandidates(unknown, known, limit);
  if (picked.length === 0) return { cards: [], pickMeta: [] };

  const pickMeta: PickMeta[] = picked.map((p) => ({
    termId: p.termId,
    originStatus: originOf(p),
  }));

  const cards = await hydrateTermsAsTermCards(
    client,
    picked.map((p) => p.termId),
  );

  return { cards, pickMeta };
}

/** Service-role counterpart of {@link pickMixedReviewTerms} (Telegram). */
export async function pickMixedReviewTermsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
  excludeTermIds?: string[],
): Promise<PickReviewResult> {
  let [unknown, known] = await Promise.all([
    fetchCandidatesForUser(client, userId, scope, "unknown"),
    fetchCandidatesForUser(client, userId, scope, "known"),
  ]);

  if (excludeTermIds && excludeTermIds.length > 0) {
    const excludeSet = new Set(excludeTermIds);
    unknown = unknown.filter((c) => !excludeSet.has(c.termId));
    known = known.filter((c) => !excludeSet.has(c.termId));
  }

  if (unknown.length === 0 && known.length === 0) return { cards: [], pickMeta: [] };

  const picked = mixReviewCandidates(unknown, known, limit);
  if (picked.length === 0) return { cards: [], pickMeta: [] };

  const pickMeta: PickMeta[] = picked.map((p) => ({
    termId: p.termId,
    originStatus: originOf(p),
  }));

  const cards = await hydrateTermCardsForUser(
    client,
    userId,
    picked.map((p) => p.termId),
  );

  return { cards, pickMeta };
}

/** Every candidate in the pool, unsorted — debug/inspection only (the
 *  `/jargon/debug` page shows the raw pool, there's no score to rank by). */
export async function listCandidates(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
): Promise<import("./types").ReviewCandidate[]> {
  return fetchCandidates(client, userId, scope, status);
}

/** Review's mixed-pool counterpart of {@link listCandidates} — every
 *  candidate from both pools, tagged with origin, unsorted. */
export async function listMixedReviewCandidates(
  client: Client,
  userId: string,
  scope: ReviewScope,
): Promise<{
  rows: import("./types").ReviewCandidate[];
  knownCount: number;
  unknownCount: number;
}> {
  const [unknown, known] = await Promise.all([
    fetchCandidates(client, userId, scope, "unknown"),
    fetchCandidates(client, userId, scope, "known"),
  ]);
  return { rows: [...unknown, ...known], knownCount: known.length, unknownCount: unknown.length };
}

/** Quiz's dedicated pick path: known pool only. Session-scoped (web). */
export async function pickQuizTermCards(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
): Promise<PickReviewResult> {
  const candidates = await fetchCandidates(client, userId, scope, "known");

  if (candidates.length === 0) return { cards: [], pickMeta: [] };

  const picked = pickQuizTerms(candidates, limit);
  if (picked.length === 0) return { cards: [], pickMeta: [] };

  const pickMeta: PickMeta[] = picked.map((p) => ({ termId: p.termId }));

  const cards = await hydrateTermsAsTermCards(
    client,
    picked.map((p) => p.termId),
  );

  return { cards, pickMeta };
}

/** Service-role counterpart of {@link pickQuizTermCards} — explicit userId (Telegram). */
export async function pickQuizTermCardsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
  excludeTermIds?: string[],
): Promise<PickReviewResult> {
  let candidates = await fetchCandidatesForUser(client, userId, scope, "known");

  if (excludeTermIds && excludeTermIds.length > 0) {
    const excludeSet = new Set(excludeTermIds);
    candidates = candidates.filter((c) => !excludeSet.has(c.termId));
  }

  if (candidates.length === 0) return { cards: [], pickMeta: [] };

  const picked = pickQuizTerms(candidates, limit);
  if (picked.length === 0) return { cards: [], pickMeta: [] };

  const pickMeta: PickMeta[] = picked.map((p) => ({ termId: p.termId }));

  const cards = await hydrateTermCardsForUser(
    client,
    userId,
    picked.map((p) => p.termId),
  );

  return { cards, pickMeta };
}

/** Read's stale-known fallback pick: known pool only, random — same as
 *  every other pick now. Called by getNextReadTermAction and
 *  fetchWidgetState only after their own unknown-pool pick comes back empty
 *  and read_mode === "stale_known". Service-role only. */
export async function pickStaleKnownTermsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
  excludeTermIds?: string[],
): Promise<PickReviewResult> {
  let candidates = await fetchCandidatesForUser(client, userId, scope, "known");

  if (excludeTermIds && excludeTermIds.length > 0) {
    const excludeSet = new Set(excludeTermIds);
    candidates = candidates.filter((c) => !excludeSet.has(c.termId));
  }

  if (candidates.length === 0) return { cards: [], pickMeta: [] };

  const picked = pickStaleKnownTerms(candidates, limit);
  if (picked.length === 0) return { cards: [], pickMeta: [] };

  const pickMeta: PickMeta[] = picked.map((p) => ({ termId: p.termId }));

  const cards = await hydrateTermCardsForUser(
    client,
    userId,
    picked.map((p) => p.termId),
  );

  return { cards, pickMeta };
}

export async function getReviewPoolStats(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
  context: import("./types").PickContext,
): Promise<PoolStats> {
  const candidates = await fetchCandidates(client, userId, scope, status);
  return computePoolStats(candidates, context);
}

function poolStatsByDomain(
  candidates: import("./types").ReviewCandidate[],
  context: import("./types").PickContext,
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
  context: import("./types").PickContext,
): Promise<PoolStats> {
  const candidates = await fetchCandidatesForUser(client, userId, scope, status);
  return computePoolStats(candidates, context);
}

function combinePoolStats(a: PoolStats, b: PoolStats): PoolStats {
  return {
    unseen: a.unseen + b.unseen,
    seen: a.seen + b.seen,
    total: a.total + b.total,
    allSeenOnce: a.allSeenOnce && b.allSeenOnce,
  };
}

/** Review's mixed-pool counterpart of {@link getReviewPoolStats} — combined
 *  stats across both pools, since Review no longer inspects one at a time. */
export async function getMixedReviewPoolStats(
  client: Client,
  userId: string,
  scope: ReviewScope,
): Promise<PoolStats> {
  const [unknownStats, knownStats] = await Promise.all([
    getReviewPoolStats(client, userId, scope, "unknown", "review"),
    getReviewPoolStats(client, userId, scope, "known", "review"),
  ]);
  return combinePoolStats(unknownStats, knownStats);
}

/** Service-role counterpart of {@link getMixedReviewPoolStats} (Telegram). */
export async function getMixedReviewPoolStatsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
): Promise<PoolStats> {
  const [unknownStats, knownStats] = await Promise.all([
    getReviewPoolStatsForUser(client, userId, scope, "unknown", "review"),
    getReviewPoolStatsForUser(client, userId, scope, "known", "review"),
  ]);
  return combinePoolStats(unknownStats, knownStats);
}

/** Every active-collection candidate for status, unsorted — callers group/aggregate themselves.
 *  Service-role: explicit userId, no RLS session required (Telegram). */
export const fetchActiveReviewCandidatesForUser = cache(
  async function fetchActiveReviewCandidatesForUser(
    client: Client,
    userId: string,
    status: "known" | "unknown",
  ): Promise<import("./types").ReviewCandidate[]> {
    return fetchCandidatesForUser(client, userId, { domainIds: "all" }, status);
  },
);

/** Session-scoped counterpart of {@link fetchActiveReviewCandidatesForUser} — RLS via `auth.uid()` (web). */
export const fetchActiveReviewCandidates = cache(async function fetchActiveReviewCandidates(
  client: Client,
  userId: string,
  status: "known" | "unknown",
): Promise<import("./types").ReviewCandidate[]> {
  return fetchCandidates(client, userId, { domainIds: "all" }, status);
});

export async function getReviewPoolStatsByDomainForUser(
  client: Client,
  userId: string,
  status: "known" | "unknown",
  context: import("./types").PickContext,
): Promise<Map<string, PoolStats>> {
  const candidates = await fetchCandidatesForUser(client, userId, { domainIds: "all" }, status);
  return poolStatsByDomain(candidates, context);
}
