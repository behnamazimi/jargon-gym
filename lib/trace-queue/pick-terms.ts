/** Trace-queue pick-terms — composes fetch + rank + hydrate for Read/Review/Quiz. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import { rankQuizQueue, rankReadQueue, rankReviewQueue } from "@/lib/trace";
import { fetchTraceCandidates, fetchTraceCandidatesForUser, type ReviewScope } from "./repository";
import { hydrateTermCardsForUser, hydrateTermsAsTermCards } from "./hydrate";
import type { TraceCandidate } from "./types";

type Client = SupabaseClient<Database>;

function excludeTerms(candidates: TraceCandidate[], excludeTermIds?: string[]): TraceCandidate[] {
  if (!excludeTermIds || excludeTermIds.length === 0) return candidates;
  const excludeSet = new Set(excludeTermIds);
  return candidates.filter((c) => !excludeSet.has(c.termId));
}

/** Terms the user has manually marked known are excluded from Read/Review/
 *  Quiz entirely — a separate, user-set signal from TRACE's earned known
 *  label (see review_state.marked_known_at). Mastery/stats callers use
 *  fetchActiveTraceCandidates(ForUser) directly and must NOT apply this. */
function excludeMarkedKnown(candidates: TraceCandidate[]): TraceCandidate[] {
  return candidates.filter((c) => !c.markedKnownAt);
}

/** A term is "new to user" the moment it's picked with zero prior read,
 *  review, or quiz activity — used to gate the one-time first-exposure
 *  "mark known" prompt in Read/Review. Computed from the candidate as
 *  fetched (before hydration drops that state), then merged back onto the
 *  hydrated TermCards by id. */
function withIsNewToUser(cards: TermCard[], candidates: TraceCandidate[]): TermCard[] {
  const isNewById = new Map(
    candidates.map((c) => [
      c.termId,
      c.readCount === 0 && c.reviewRecallCount === 0 && c.quizTestCount === 0,
    ]),
  );
  return cards.map((card) => ({ ...card, isNewToUser: isNewById.get(card.id) ?? false }));
}

/** Read: single ranked pool, lowest exposure first. */
export async function pickReadTerms(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
): Promise<TermCard[]> {
  const candidates = excludeMarkedKnown(await fetchTraceCandidates(client, userId, scope));
  if (candidates.length === 0) return [];

  const ranked = rankReadQueue(candidates, new Date()).slice(0, limit);
  if (ranked.length === 0) return [];

  const cards = await hydrateTermsAsTermCards(
    client,
    ranked.map((c) => c.termId),
  );
  return withIsNewToUser(cards, ranked);
}

/** Service-role counterpart of {@link pickReadTerms} (Telegram, widget). */
export async function pickReadTermsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
  excludeTermIds?: string[],
): Promise<TermCard[]> {
  const candidates = excludeMarkedKnown(
    excludeTerms(await fetchTraceCandidatesForUser(client, userId, scope), excludeTermIds),
  );
  if (candidates.length === 0) return [];

  const ranked = rankReadQueue(candidates, new Date()).slice(0, limit);
  if (ranked.length === 0) return [];

  const cards = await hydrateTermCardsForUser(
    client,
    userId,
    ranked.map((c) => c.termId),
  );
  return withIsNewToUser(cards, ranked);
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
  const candidates = excludeMarkedKnown(await fetchTraceCandidates(client, userId, scope));
  if (candidates.length === 0) return [];

  const ranked = rankReviewQueue(candidates, new Date()).slice(0, limit);
  if (ranked.length === 0) return [];

  const cards = await hydrateTermsAsTermCards(
    client,
    ranked.map((c) => c.termId),
  );
  return withIsNewToUser(cards, ranked);
}

/** Service-role counterpart of {@link pickReviewTerms} (Telegram). */
export async function pickReviewTermsForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
  excludeTermIds?: string[],
): Promise<TermCard[]> {
  const candidates = excludeMarkedKnown(
    excludeTerms(await fetchTraceCandidatesForUser(client, userId, scope), excludeTermIds),
  );
  if (candidates.length === 0) return [];

  const ranked = rankReviewQueue(candidates, new Date()).slice(0, limit);
  if (ranked.length === 0) return [];

  const cards = await hydrateTermCardsForUser(
    client,
    userId,
    ranked.map((c) => c.termId),
  );
  return withIsNewToUser(cards, ranked);
}

/** Quiz: ranked by R_g(t) ascending, same shape as Review — terms with no
 *  quiz history yet rank first (§5) rather than being excluded. */
export async function pickQuizTerms(
  client: Client,
  userId: string,
  scope: ReviewScope,
  limit: number,
): Promise<TermCard[]> {
  const candidates = excludeMarkedKnown(await fetchTraceCandidates(client, userId, scope));
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
  const candidates = excludeMarkedKnown(
    excludeTerms(await fetchTraceCandidatesForUser(client, userId, scope), excludeTermIds),
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
