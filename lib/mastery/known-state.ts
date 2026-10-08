import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { computeTraceSnapshot, type TraceState } from "@/lib/trace";
import { fetchUserCollection, fetchUserCollectionForUser } from "@/lib/library/collections";

type Client = SupabaseClient<Database>;

export type CollectionProgressState = {
  knownTermIds: string[];
  /** Terms the user manually marked known — a separate, user-set signal
   *  from TRACE's earned `knownTermIds` label above. Never conflated. */
  markedKnownTermIds: string[];
  /** Terms with a permanent ever_mastered_at high-water mark — distinct
   *  from the live, decaying `knownTermIds` label above. */
  everMasteredTermIds: string[];
};

function toTraceState(row: {
  read_count: number;
  last_read_at: string | null;
  recall_stability: number | null;
  recall_difficulty: number | null;
  review_recall_count: number;
  last_review_recall_at: string | null;
  quiz_knowledge_posterior: number | null;
  quiz_test_count: number;
  last_quiz_tested_at: string | null;
}): TraceState {
  return {
    readCount: row.read_count,
    lastReadAt: row.last_read_at ? new Date(row.last_read_at) : null,
    recallStability: row.recall_stability,
    recallDifficulty: row.recall_difficulty,
    reviewRecallCount: row.review_recall_count,
    lastReviewRecallAt: row.last_review_recall_at ? new Date(row.last_review_recall_at) : null,
    quizKnowledgePosterior: row.quiz_knowledge_posterior,
    quizTestCount: row.quiz_test_count,
    lastQuizTestedAt: row.last_quiz_tested_at ? new Date(row.last_quiz_tested_at) : null,
  };
}

/** Known-term IDs for every term in the given collections, including paused
 *  collections. "Known" is a read-only label derived live from
 *  Mastery_adjusted (lib/trace.deriveKnownLabel) — one RPC joins
 *  terms + review_state server-side by collection_id, avoiding a term-id list
 *  in an `.in()` filter that blows past PostgREST's URL length limit for
 *  large collections. */
export async function fetchProgressStateByCollection(
  client: Client,
  collectionIds: string[],
): Promise<CollectionProgressState> {
  if (collectionIds.length === 0) {
    return { knownTermIds: [], markedKnownTermIds: [], everMasteredTermIds: [] };
  }

  const data = await fetchAllRows((from, to) =>
    client
      .rpc("my_progress_state_by_collection", { p_collection_ids: collectionIds })
      .order("term_id")
      .range(from, to),
  );

  const now = new Date();
  const knownTermIds: string[] = [];
  const markedKnownTermIds: string[] = [];
  const everMasteredTermIds: string[] = [];

  for (const row of data) {
    if (computeTraceSnapshot(toTraceState(row), now).knownLabel === "known") {
      knownTermIds.push(row.term_id);
    }
    if (row.marked_known_at !== null) {
      markedKnownTermIds.push(row.term_id);
    }
    if (row.ever_mastered_at !== null) {
      everMasteredTermIds.push(row.term_id);
    }
  }

  return { knownTermIds, markedKnownTermIds, everMasteredTermIds };
}

async function fetchReviewCollectionIdsFromRpc(client: Client, userId: string) {
  const { data, error } = await client.rpc("review_collection_ids", {
    p_user_id: userId,
  });

  if (error) throw error;
  return data ?? [];
}

export const resolveReviewCollectionIds = cache(async function resolveReviewCollectionIds(
  client: Client,
  userId: string,
) {
  const [collectionRows, reviewCollectionIds] = await Promise.all([
    fetchUserCollection(client, userId),
    client.rpc("my_review_collection_ids").then(({ data, error }) => {
      if (error) throw error;
      return data ?? [];
    }),
  ]);

  return { reviewCollectionIds, collectionRows };
});

export const resolveReviewCollectionIdsForUser = cache(
  async function resolveReviewCollectionIdsForUser(client: Client, userId: string) {
    const [collectionRows, reviewCollectionIds] = await Promise.all([
      fetchUserCollectionForUser(client, userId),
      fetchReviewCollectionIdsFromRpc(client, userId),
    ]);

    return { reviewCollectionIds, collectionRows };
  },
);

export async function resetCollectionProgress(
  client: Client,
  _userId: string,
  collectionId: string,
) {
  const { error } = await client.rpc("my_reset_collection_progress", {
    p_collection_id: collectionId,
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
