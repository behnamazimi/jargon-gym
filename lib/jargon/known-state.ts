import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { computeTraceSnapshot, type TraceState } from "@/lib/trace";
import { fetchUserCollection, fetchUserCollectionForUser } from "./collections";

type Client = SupabaseClient<Database>;

export type DomainProgressState = {
  knownTermIds: string[];
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

/** Known-term IDs for every term in the given domains, including paused
 *  collections. "Known" is a read-only label derived live from
 *  Mastery_adjusted (lib/trace.deriveKnownLabel) — one RPC joins
 *  terms + review_state server-side by domain_id, avoiding a term-id list
 *  in an `.in()` filter that blows past PostgREST's URL length limit for
 *  large collections. */
export async function fetchProgressStateByDomain(
  client: Client,
  domainIds: string[],
): Promise<DomainProgressState> {
  if (domainIds.length === 0) return { knownTermIds: [] };

  const { data, error } = await client.rpc("my_progress_state_by_domain", {
    p_domain_ids: domainIds,
  });

  if (error) throw error;

  const now = new Date();
  const knownTermIds: string[] = [];

  for (const row of data) {
    if (computeTraceSnapshot(toTraceState(row), now).knownLabel === "known") {
      knownTermIds.push(row.term_id);
    }
  }

  return { knownTermIds };
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
