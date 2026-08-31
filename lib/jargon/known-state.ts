import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchUserCollection, fetchUserCollectionForUser } from "./collections";

type Client = SupabaseClient<Database>;

export type DomainProgressState = {
  knownTermIds: string[];
};

/** Known-term IDs for every term in the given domains, including paused
 *  collections. One RPC call joins terms + user_progress + review_state
 *  server-side by domain_id — avoids shipping a term-id list into an
 *  `.in()` filter, which blows past PostgREST's URL length limit for large
 *  collections. Deliberately NOT reusing the known/unknown RPCs here, since
 *  those are scoped to active review domains only and this must also work
 *  for a paused domain the collection page is still allowed to display. */
export async function fetchProgressStateByDomain(
  client: Client,
  domainIds: string[],
): Promise<DomainProgressState> {
  if (domainIds.length === 0) return { knownTermIds: [] };

  const { data, error } = await client.rpc("my_progress_state_by_domain", {
    p_domain_ids: domainIds,
  });

  if (error) throw error;

  const knownTermIds: string[] = [];

  for (const row of data) {
    if (row.known_at) knownTermIds.push(row.term_id);
  }

  return { knownTermIds };
}

/** Flip user_progress only — queue outcomes go through review-outcome.
 *  Allowed when the term's collection is paused. */
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
    fetchUserCollectionForUser(client, userId),
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
