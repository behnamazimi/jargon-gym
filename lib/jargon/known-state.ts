import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchUserCollection } from "./collections";

type Client = SupabaseClient<Database>;

export async function fetchKnownTermIdsForDomains(
  client: Client,
  domainIds: string[],
  userId: string,
) {
  if (domainIds.length === 0) return [];

  const { data: terms, error: termsError } = await client
    .from("terms")
    .select("id")
    .in("domain_id", domainIds);

  if (termsError) throw termsError;
  if (terms.length === 0) return [];

  const termIds = terms.map((t) => t.id);
  const { data, error } = await client
    .from("user_progress")
    .select("term_id")
    .eq("user_id", userId)
    .in("term_id", termIds);

  if (error) throw error;
  return data.map((row) => row.term_id);
}

/** Flip user_progress only — queue outcomes go through review-outcome. */
export async function markTermKnown(client: Client, termId: string) {
  const { error } = await client.rpc("my_mark_term_known", {
    p_term_id: termId,
  });

  if (error) throw error;
}

/** Flip user_progress only — queue outcomes go through review-outcome. */
export async function markTermKnownForUser(client: Client, userId: string, termId: string) {
  const { error } = await client.rpc("mark_term_known", {
    p_user_id: userId,
    p_term_id: termId,
  });

  if (error) throw error;
}

/** Flip user_progress only — queue outcomes go through review-outcome. */
export async function clearTermKnown(client: Client, _userId: string, termId: string) {
  const { error } = await client.rpc("my_clear_term_known", {
    p_term_id: termId,
  });

  if (error) throw error;
}

/** Flip user_progress only — queue outcomes go through review-outcome. */
export async function clearTermKnownForUser(client: Client, userId: string, termId: string) {
  const { error } = await client.rpc("clear_term_known", {
    p_user_id: userId,
    p_term_id: termId,
  });

  if (error) throw error;
}

async function fetchReviewDomainIdsFromRpc(client: Client, userId: string) {
  const { data, error } = await client.rpc("review_domain_ids", {
    p_user_id: userId,
  });

  if (error) throw error;
  return data ?? [];
}

export async function resolveReviewDomainIds(client: Client, userId: string) {
  const [collectionRows, reviewDomainIds] = await Promise.all([
    fetchUserCollection(client, userId),
    client.rpc("my_review_domain_ids").then(({ data, error }) => {
      if (error) throw error;
      return data ?? [];
    }),
  ]);

  return { reviewDomainIds, collectionRows };
}

export async function resolveReviewDomainIdsForUser(client: Client, userId: string) {
  const [collectionRows, reviewDomainIds] = await Promise.all([
    fetchUserCollection(client, userId),
    fetchReviewDomainIdsFromRpc(client, userId),
  ]);

  return { reviewDomainIds, collectionRows };
}

export async function resetDomainProgress(client: Client, _userId: string, domainId: string) {
  const { error } = await client.rpc("my_reset_domain_progress", {
    p_domain_id: domainId,
  });

  if (error) throw error;
}
