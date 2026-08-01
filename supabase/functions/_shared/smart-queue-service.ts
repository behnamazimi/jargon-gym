/** Deno smart queue service adapter — DB interaction layer for edge functions.
 *  Overview of algorithm + app coupling: docs/smart-queue.md
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { TermRow } from "./telegram-api.ts";
import type {
  ReviewCandidate,
  ReviewOutcome,
  ReviewPreset,
  PoolStats,
} from "./smart-queue/types.ts";
import { pickTerms } from "./smart-queue/pick.ts";
import { computePoolStats } from "./smart-queue/stats.ts";

export type ReviewScope = {
  domainIds: string[] | "all";
};

function mapTermCard(row: Record<string, unknown>): TermRow {
  return {
    id: String(row.id),
    term: String(row.term),
    category: String(row.category),
    definition: row.definition == null ? "" : String(row.definition),
    example: (row.example as string | null) ?? null,
    discussion: (row.discussion as string | null) ?? null,
    controversy: (row.controversy as string | null) ?? null,
    domain_id: String(row.domain_id),
    domain_name: String(row.domain_name),
    relationships: Array.isArray(row.relationships)
      ? (row.relationships as TermRow["relationships"])
      : [],
  };
}

async function loadUserPreset(client: SupabaseClient, userId: string): Promise<ReviewPreset> {
  const { data, error } = await client
    .from("user_settings")
    .select("review_preset")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.review_preset as ReviewPreset | null) ?? "balanced";
}

async function fetchCandidates(
  client: SupabaseClient,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
): Promise<ReviewCandidate[]> {
  const { data: reviewDomainIds, error: domainError } = await client.rpc(
    "telegram_review_domain_ids",
    { p_user_id: userId },
  );

  if (domainError) throw domainError;

  const allReviewDomains = (reviewDomainIds as string[]) ?? [];

  const scopedDomainIds =
    scope.domainIds === "all"
      ? allReviewDomains
      : scope.domainIds.filter((domainId) => allReviewDomains.includes(domainId));

  if (scopedDomainIds.length === 0) return [];

  const { data: termRows, error: termsError } = await client
    .from("terms")
    .select("id, domain_id, created_at")
    .in("domain_id", scopedDomainIds);

  if (termsError) throw termsError;
  if (!termRows || termRows.length === 0) return [];

  const termIds = termRows.map((term: { id: string }) => term.id);

  const [{ data: progress, error: progressError }, { data: reviewStates, error: reviewError }] =
    await Promise.all([
      client
        .from("user_progress")
        .select("term_id")
        .eq("user_id", userId)
        .eq("is_known", true)
        .in("term_id", termIds),
      client
        .from("review_state")
        .select("term_id, seen_count, last_seen_at, last_outcome")
        .eq("user_id", userId)
        .in("term_id", termIds),
    ]);

  if (progressError) throw progressError;
  if (reviewError) throw reviewError;

  const knownIds = new Set((progress ?? []).map((row: { term_id: string }) => row.term_id));
  const stateByTermId = new Map(
    (reviewStates ?? []).map(
      (row: {
        term_id: string;
        seen_count: number;
        last_seen_at: string | null;
        last_outcome: string;
      }) => [row.term_id, row],
    ),
  );

  return termRows
    .filter((term: { id: string }) =>
      status === "known" ? knownIds.has(term.id) : !knownIds.has(term.id),
    )
    .map((term: { id: string; domain_id: string; created_at: string }) => {
      const state = stateByTermId.get(term.id);

      return {
        termId: term.id,
        domainId: term.domain_id,
        createdAt: new Date(term.created_at),
        seenCount: state?.seen_count ?? 0,
        lastSeenAt: state?.last_seen_at ? new Date(state.last_seen_at) : null,
        lastOutcome: (state?.last_outcome as ReviewOutcome | null) ?? "unseen",
      };
    });
}

export async function pickReviewTerms(
  client: SupabaseClient,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
  limit: number,
): Promise<TermRow[]> {
  const [candidates, preset] = await Promise.all([
    fetchCandidates(client, userId, scope, status),
    loadUserPreset(client, userId),
  ]);

  if (candidates.length === 0) return [];

  const scored = pickTerms(candidates, preset, limit);
  if (scored.length === 0) return [];

  const cards = await Promise.all(
    scored.map(async (candidate) => {
      const { data, error } = await client.rpc("get_term_card", {
        p_user_id: userId,
        p_term_id: candidate.termId,
      });

      if (error) {
        throw new Error(`Failed to load term card ${candidate.termId}: ${error.message}`);
      }

      const row = (data?.[0] as Record<string, unknown> | undefined) ?? null;
      if (!row) {
        throw new Error(`Term card missing for ${candidate.termId}`);
      }

      return mapTermCard(row);
    }),
  );

  // Preserve score order from Promise.all (same index order as scored)
  return cards;
}

export async function recordReviewOutcome(
  client: SupabaseClient,
  userId: string,
  termId: string,
  outcome: ReviewOutcome,
  incrementSeen = true,
): Promise<void> {
  const { error } = await client.rpc("record_review_outcome", {
    p_user_id: userId,
    p_term_id: termId,
    p_outcome: outcome,
    p_increment_seen: incrementSeen,
  });

  if (error) throw error;
}

export async function getReviewPoolStats(
  client: SupabaseClient,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
): Promise<PoolStats> {
  const candidates = await fetchCandidates(client, userId, scope, status);
  return computePoolStats(candidates);
}

export async function getReviewPoolStatsByDomain(
  client: SupabaseClient,
  userId: string,
  status: "known" | "unknown",
): Promise<Map<string, PoolStats>> {
  const candidates = await fetchCandidates(client, userId, { domainIds: "all" }, status);
  const byDomain = new Map<string, ReviewCandidate[]>();

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
