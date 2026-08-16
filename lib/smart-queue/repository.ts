/** Smart-queue DB repository — RPC only. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FailSource, ReviewCandidate, ReviewEvent } from "./types";

type Client = SupabaseClient<Database>;

export type ReviewScope = {
  domainIds: string[] | "all";
};

function mapCandidateRows(
  data: Array<{
    term_id: string;
    domain_id: string;
    created_at: string;
    read_count: number;
    last_read_at: string | null;
    review_recall_count: number;
    last_review_recall_at: string | null;
    review_streak: number;
    quiz_test_count: number;
    last_quiz_tested_at: string | null;
    quiz_streak: number;
    pending_reveal: boolean;
    last_fail_at: string | null;
    last_fail_source: Database["public"]["Enums"]["review_fail_source"] | null;
    review_fail_count: number;
    quiz_fail_count: number;
    known_at: string | null;
  }>,
): ReviewCandidate[] {
  return data.map((row) => ({
    termId: row.term_id,
    domainId: row.domain_id,
    createdAt: new Date(row.created_at),
    readCount: row.read_count,
    lastReadAt: row.last_read_at ? new Date(row.last_read_at) : null,
    reviewRecallCount: row.review_recall_count,
    lastReviewRecallAt: row.last_review_recall_at ? new Date(row.last_review_recall_at) : null,
    reviewStreak: row.review_streak,
    quizTestCount: row.quiz_test_count,
    lastQuizTestedAt: row.last_quiz_tested_at ? new Date(row.last_quiz_tested_at) : null,
    quizStreak: row.quiz_streak,
    pendingReveal: row.pending_reveal,
    lastFailAt: row.last_fail_at ? new Date(row.last_fail_at) : null,
    lastFailSource: row.last_fail_source as FailSource | null,
    reviewFailCount: row.review_fail_count,
    quizFailCount: row.quiz_fail_count,
    knownAt: row.known_at ? new Date(row.known_at) : null,
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
export async function recordReviewEvent(
  client: Client,
  termId: string,
  event: ReviewEvent,
): Promise<void> {
  const { error } = await client.rpc("my_record_review_event", {
    p_term_id: termId,
    p_event: event,
  });

  if (error) throw error;
}

/** Internal — only review-outcome should call these. */
export async function recordReviewEventForUser(
  client: Client,
  userId: string,
  termId: string,
  event: ReviewEvent,
): Promise<void> {
  const { error } = await client.rpc("record_review_event", {
    p_user_id: userId,
    p_term_id: termId,
    p_event: event,
  });

  if (error) throw error;
}
