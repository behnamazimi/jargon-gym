/** Smart-queue service — composes pick + hydrate + stats. No direct RPCs. */

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import type { PickContext, PickMeta, PoolStats, ScoredCandidate } from "./types";
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
import { strengthForCandidate } from "./strength";

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

/** Review's blended pick: fetches both pools, ranks each independently, and
 *  interleaves at the RANKING.reviewMix ratio (see pick.ts). No status param
 *  — Review no longer has a pure-pool mode. */
export async function pickMixedReviewTerms(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
  context: PickContext,
): Promise<PickReviewResult> {
  const [unknown, known] = await Promise.all([
    fetchCandidates(client, userId, scope, "unknown"),
    fetchCandidates(client, userId, scope, "known"),
  ]);

  if (unknown.length === 0 && known.length === 0) return { cards: [], pickMeta: [] };

  const scored = mixReviewCandidates(unknown, known, limit, context);
  if (scored.length === 0) return { cards: [], pickMeta: [] };

  const now = new Date();
  const pickMeta: PickMeta[] = scored.map((s) => ({
    termId: s.termId,
    score: s.score,
    reasons: s.reasons,
    strength: strengthForCandidate(s, context, now),
    originStatus: originOf(s),
  }));

  const cards = await hydrateTermsAsTermCards(
    client,
    scored.map((s) => s.termId),
  );

  return { cards, pickMeta };
}

/** Service-role counterpart of {@link pickMixedReviewTerms} (Telegram). */
export async function pickMixedReviewTermsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
  context: PickContext,
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

  const scored = mixReviewCandidates(unknown, known, limit, context);
  if (scored.length === 0) return { cards: [], pickMeta: [] };

  const now = new Date();
  const pickMeta: PickMeta[] = scored.map((s) => ({
    termId: s.termId,
    score: s.score,
    reasons: s.reasons,
    strength: strengthForCandidate(s, context, now),
    originStatus: originOf(s),
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

/** Every known-pool staleness candidate for Read's stale-known fallback,
 *  sorted — no slicing. Debug/inspection only. Session-scoped (web),
 *  mirrors listScoredCandidates but via pickStaleKnownTerms instead of the
 *  score engine, same as pickStaleKnownTermsForUser does for the live pick. */
export async function listStaleKnownCandidates(
  client: Client,
  userId: string,
  scope: ReviewScope,
): Promise<ScoredCandidate[]> {
  const candidates = await fetchCandidates(client, userId, scope, "known");
  if (candidates.length === 0) return [];
  return pickStaleKnownTerms(candidates, candidates.length);
}

/** Review's mixed-pool counterpart of {@link listScoredCandidates} — every
 *  candidate from both pools, scored, tagged with origin, and merged at the
 *  RANKING.reviewMix ratio — no slicing. Debug/inspection only. */
export async function listScoredMixedReviewCandidates(
  client: Client,
  userId: string,
  scope: ReviewScope,
): Promise<{ rows: ScoredCandidate[]; knownCount: number; unknownCount: number }> {
  const [unknown, known] = await Promise.all([
    fetchCandidates(client, userId, scope, "unknown"),
    fetchCandidates(client, userId, scope, "known"),
  ]);
  const total = unknown.length + known.length;
  if (total === 0) return { rows: [], knownCount: 0, unknownCount: 0 };

  const rows = mixReviewCandidates(unknown, known, total, "review", {
    includeOwnFailSitOut: true,
  });
  const knownCount = rows.filter((r) => originOf(r) === "known").length;
  return { rows, knownCount, unknownCount: rows.length - knownCount };
}

/** Service-role counterpart of {@link listScoredMixedReviewCandidates} (Telegram/debug via admin client). */
export async function listScoredMixedReviewCandidatesForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
): Promise<{ rows: ScoredCandidate[]; knownCount: number; unknownCount: number }> {
  const [unknown, known] = await Promise.all([
    fetchCandidatesForUser(client, userId, scope, "unknown"),
    fetchCandidatesForUser(client, userId, scope, "known"),
  ]);
  const total = unknown.length + known.length;
  if (total === 0) return { rows: [], knownCount: 0, unknownCount: 0 };

  const rows = mixReviewCandidates(unknown, known, total, "review", {
    includeOwnFailSitOut: true,
  });
  const knownCount = rows.filter((r) => originOf(r) === "known").length;
  return { rows, knownCount, unknownCount: rows.length - knownCount };
}

/** Quiz's dedicated pick path: known pool only, hard tiers via pickQuizTerms
 *  instead of pickTerms's score mix. Session-scoped (web). */
export async function pickQuizTermCards(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
): Promise<PickReviewResult> {
  const candidates = await fetchCandidates(client, userId, scope, "known");

  if (candidates.length === 0) return { cards: [], pickMeta: [] };

  const scored = pickQuizTerms(candidates, limit);
  if (scored.length === 0) return { cards: [], pickMeta: [] };

  const now = new Date();
  const pickMeta: PickMeta[] = scored.map((s) => ({
    termId: s.termId,
    score: s.score,
    reasons: s.reasons,
    strength: strengthForCandidate(s, "quiz", now),
  }));

  const cards = await hydrateTermsAsTermCards(
    client,
    scored.map((s) => s.termId),
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

  const scored = pickQuizTerms(candidates, limit);
  if (scored.length === 0) return { cards: [], pickMeta: [] };

  const now = new Date();
  const pickMeta: PickMeta[] = scored.map((s) => ({
    termId: s.termId,
    score: s.score,
    reasons: s.reasons,
    strength: strengthForCandidate(s, "quiz", now),
  }));

  const cards = await hydrateTermCardsForUser(
    client,
    userId,
    scored.map((s) => s.termId),
  );

  return { cards, pickMeta };
}

/** Read's stale-known fallback pick: known pool only, plain staleness sort
 *  via pickStaleKnownTerms instead of pickTerms's score engine. Called by
 *  getNextReadTermAction and fetchWidgetState only after their own unknown-
 *  pool pick comes back empty and read_mode === "stale_known". Service-role
 *  only — both current callers already use the admin client. */
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

  const scored = pickStaleKnownTerms(candidates, limit);
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

/** Every known-pool Quiz candidate, tiered and sorted — no slicing.
 *  Debug/inspection + setup-preview grouping. */
export async function listScoredQuizCandidates(
  client: Client,
  userId: string,
  scope: ReviewScope,
): Promise<ScoredCandidate[]> {
  const candidates = await fetchCandidates(client, userId, scope, "known");
  if (candidates.length === 0) return [];
  return pickQuizTerms(candidates, candidates.length, { includeSitOuts: true });
}

/** Service-role counterpart of {@link listScoredQuizCandidates} (Telegram/debug via admin client). */
export async function listScoredQuizCandidatesForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
): Promise<ScoredCandidate[]> {
  const candidates = await fetchCandidatesForUser(client, userId, scope, "known");
  if (candidates.length === 0) return [];
  return pickQuizTerms(candidates, candidates.length, { includeSitOuts: true });
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

function combinePoolStats(a: PoolStats, b: PoolStats): PoolStats {
  return {
    unseen: a.unseen + b.unseen,
    seen: a.seen + b.seen,
    stale: a.stale + b.stale,
    recent: a.recent + b.recent,
    struggling: a.struggling + b.struggling,
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
  context: PickContext,
): Promise<Map<string, PoolStats>> {
  const candidates = await fetchCandidatesForUser(client, userId, { domainIds: "all" }, status);
  return poolStatsByDomain(candidates, context);
}
