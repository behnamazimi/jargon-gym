/** Smart-queue DB repository — RPC only. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ReviewCandidate, ReviewOutcome, ReviewPreset } from "./types";

type Client = SupabaseClient<Database>;

export type ReviewScope = {
  domainIds: string[] | "all";
};

export async function loadUserPreset(client: Client, userId: string): Promise<ReviewPreset> {
  const { data, error } = await client
    .from("user_settings")
    .select("review_preset")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.review_preset as ReviewPreset | null) ?? "balanced";
}

function mapCandidateRows(
  data: Array<{
    term_id: string;
    domain_id: string;
    created_at: string;
    seen_count: number;
    last_seen_at: string | null;
    last_outcome: Database["public"]["Enums"]["review_outcome"];
  }>,
): ReviewCandidate[] {
  return data.map((row) => ({
    termId: row.term_id,
    domainId: row.domain_id,
    createdAt: new Date(row.created_at),
    seenCount: row.seen_count,
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : null,
    lastOutcome: row.last_outcome as ReviewOutcome,
  }));
}

export async function fetchCandidates(
  client: Client,
  _userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
): Promise<ReviewCandidate[]> {
  const { data, error } = await client.rpc("my_get_review_candidates", {
    p_domain_ids: scope.domainIds === "all" ? undefined : scope.domainIds,
    p_status: status,
  });

  if (error) throw error;
  return mapCandidateRows(data ?? []);
}

/** Service-role / admin client: candidates for an explicit userId. */
export async function fetchCandidatesForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
  status: "known" | "unknown",
): Promise<ReviewCandidate[]> {
  const { data, error } = await client.rpc("get_review_candidates", {
    p_user_id: userId,
    p_domain_ids: scope.domainIds === "all" ? undefined : scope.domainIds,
    p_status: status,
  });

  if (error) throw error;
  return mapCandidateRows(data ?? []);
}

/** Internal — only review-outcome should call these. */
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

/** Internal — only review-outcome should call these. */
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
