import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchUserCollection,
  fetchUserCollectionForUser,
  fetchUserCollectionWithProgressRows,
} from "./collections";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

async function fetchReviewDomainIdsFromRpc(client: Client, userId: string) {
  const { data, error } = await client.rpc("review_domain_ids", {
    p_user_id: userId,
  });

  if (error) throw error;
  return data ?? [];
}

async function fetchMyReviewDomainIdsFromRpc(client: Client) {
  const { data, error } = await client.rpc("my_review_domain_ids");
  if (error) throw error;
  return data ?? [];
}

export const resolveReviewDomainIds = cache(async function resolveReviewDomainIds(
  client: Client,
  userId: string,
) {
  const [collectionRows, reviewDomainIds] = await Promise.all([
    fetchUserCollection(client, userId),
    fetchMyReviewDomainIdsFromRpc(client),
  ]);

  return { reviewDomainIds, collectionRows };
});

export const resolveReviewDomainIdsForUser = cache(async function resolveReviewDomainIdsForUser(
  client: Client,
  userId: string,
) {
  const [collectionRows, reviewDomainIds] = await Promise.all([
    fetchUserCollectionForUser(client, userId),
    fetchReviewDomainIdsFromRpc(client, userId),
  ]);

  return { reviewDomainIds, collectionRows };
});

/** Like {@link resolveReviewDomainIds}, but also returns the raw progress
 *  rows the collection stats were tallied from — for callers (the
 *  collection page) that additionally need one specific domain's
 *  known/marked/mastered term ids without a second round trip to
 *  my_progress_state_by_domain. Use foldProgressStateRows on the result. */
export const resolveReviewDomainIdsWithProgressRows = cache(
  async function resolveReviewDomainIdsWithProgressRows(client: Client, userId: string) {
    const [{ rows: collectionRows, progressRows }, reviewDomainIds] = await Promise.all([
      fetchUserCollectionWithProgressRows(client, userId),
      fetchMyReviewDomainIdsFromRpc(client),
    ]);

    return { reviewDomainIds, collectionRows, progressRows };
  },
);

export async function resetDomainProgress(client: Client, _userId: string, domainId: string) {
  const { error } = await client.rpc("my_reset_domain_progress", {
    p_domain_id: domainId,
  });

  if (error) throw error;
}

/** Manually mark/unmark a term known. A separate, user-set signal from
 *  TRACE's earned state — never touches recall_stability, quiz_knowledge_
 *  posterior, or the ever_mastered_at/ever_learning_at high-water marks. */
export async function setTermMarkedKnown(
  client: Client,
  _userId: string,
  termId: string,
  marked: boolean,
) {
  const { error } = await client.rpc("my_set_term_marked_known", {
    p_term_id: termId,
    p_marked: marked,
  });

  if (error) throw error;
}

/** Service-role counterpart of {@link setTermMarkedKnown} (Telegram). */
export async function setTermMarkedKnownForUser(
  client: Client,
  userId: string,
  termId: string,
  marked: boolean,
) {
  const { error } = await client.rpc("set_term_marked_known", {
    p_user_id: userId,
    p_term_id: termId,
    p_marked: marked,
  });

  if (error) throw error;
}
