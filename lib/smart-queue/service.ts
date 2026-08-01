/** Next.js smart queue service adapter — DB interaction layer.
 *  Overview of algorithm + app coupling: docs/smart-queue.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resolveReviewDomainIds } from "@/lib/jargon/known-state";
import { attachRelationshipsToTerms, mapTerm } from "@/lib/jargon/mappers";
import { fetchTermRelationshipsForTerms } from "@/lib/jargon/terms";
import type { ReviewTerm } from "@/lib/review/types";
import type { ReviewCandidate, ReviewOutcome, ReviewPreset, PoolStats } from "./types";
import { pickTerms } from "./pick";
import { computePoolStats } from "./stats";

type Client = SupabaseClient<Database>;

export type ReviewScope = {
  domainIds: string[] | "all";
};

async function loadUserPreset(client: Client, userId: string): Promise<ReviewPreset> {
  const { data, error } = await client
    .from("user_settings")
    .select("review_preset")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.review_preset as ReviewPreset | null) ?? "balanced";
}

async function fetchCandidates(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
): Promise<ReviewCandidate[]> {
  const { reviewDomainIds } = await resolveReviewDomainIds(client, userId);

  const scopedDomainIds =
    scope.domainIds === "all"
      ? reviewDomainIds
      : scope.domainIds.filter((domainId) => reviewDomainIds.includes(domainId));

  if (scopedDomainIds.length === 0) return [];

  const { data: termRows, error: termsError } = await client
    .from("terms")
    .select("id, domain_id, created_at")
    .in("domain_id", scopedDomainIds);

  if (termsError) throw termsError;
  if (termRows.length === 0) return [];

  const termIds = termRows.map((term) => term.id);

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

  const knownIds = new Set(progress.map((row) => row.term_id));
  const stateByTermId = new Map(reviewStates.map((row) => [row.term_id, row]));

  return termRows
    .filter((term) => (status === "known" ? knownIds.has(term.id) : !knownIds.has(term.id)))
    .map((term) => {
      const reviewState = stateByTermId.get(term.id);

      return {
        termId: term.id,
        domainId: term.domain_id,
        createdAt: new Date(term.created_at),
        seenCount: reviewState?.seen_count ?? 0,
        lastSeenAt: reviewState?.last_seen_at ? new Date(reviewState.last_seen_at) : null,
        lastOutcome: (reviewState?.last_outcome as ReviewOutcome | null) ?? "unseen",
      };
    });
}

export async function pickReviewTerms(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
  limit: number,
): Promise<ReviewTerm[]> {
  const [candidates, preset] = await Promise.all([
    fetchCandidates(client, userId, scope, status),
    loadUserPreset(client, userId),
  ]);

  if (candidates.length === 0) return [];

  const scored = pickTerms(candidates, preset, limit);
  if (scored.length === 0) return [];

  const { data: fullTerms, error: fullTermsError } = await client
    .from("terms")
    .select("*")
    .in(
      "id",
      scored.map((s) => s.termId),
    );

  if (fullTermsError) throw fullTermsError;
  if (fullTerms.length !== scored.length) {
    throw new Error("Could not load all selected review terms.");
  }

  const domainIds = [...new Set(fullTerms.map((t) => t.domain_id))];
  const { data: domains, error: domainsError } = await client
    .from("domains")
    .select("id, name")
    .in("id", domainIds);

  if (domainsError) throw domainsError;

  const domainNameById = new Map(domains.map((d) => [d.id, d.name]));
  const mappedTerms = fullTerms.map(mapTerm);
  const relationshipRows = await fetchTermRelationshipsForTerms(
    client,
    mappedTerms.map((t) => t.id),
  );
  const termsWithRelationships = attachRelationshipsToTerms(mappedTerms, relationshipRows);

  const termOrderMap = new Map(scored.map((s, idx) => [s.termId, idx]));
  termsWithRelationships.sort(
    (a, b) => (termOrderMap.get(a.id) ?? 999) - (termOrderMap.get(b.id) ?? 999),
  );

  return termsWithRelationships.map((term) => {
    const domainId = fullTerms.find((t) => t.id === term.id)?.domain_id;
    return {
      ...term,
      domainName: domainId ? (domainNameById.get(domainId) ?? "Unknown") : "Unknown",
    };
  });
}

export async function recordReviewOutcome(
  client: Client,
  termId: string,
  outcome: ReviewOutcome,
  incrementSeen = true,
): Promise<void> {
  const { error } = await client.rpc("my_record_review_outcome", {
    p_term_id: termId,
    p_outcome: outcome,
    p_increment_seen: incrementSeen,
  });

  if (error) throw error;
}

/** Record outcomes for a service-role / admin client (widget API). */
export async function recordReviewOutcomeForUser(
  client: Client,
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
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
): Promise<PoolStats> {
  const candidates = await fetchCandidates(client, userId, scope, status);
  return computePoolStats(candidates);
}

/** Per-domain stats for multi-collection views (web + Telegram /stat). */
export async function getReviewPoolStatsByDomain(
  client: Client,
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
