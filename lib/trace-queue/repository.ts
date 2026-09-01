/** Trace-queue DB repository — RPC only. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ReviewEvent, TraceCandidate } from "./types";

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
    recall_stability: number | null;
    recall_difficulty: number | null;
    review_recall_count: number;
    last_review_recall_at: string | null;
    quiz_knowledge_posterior: number | null;
    quiz_test_count: number;
    last_quiz_tested_at: string | null;
    ever_mastered_at: string | null;
  }>,
): TraceCandidate[] {
  return data.map((row) => ({
    termId: row.term_id,
    domainId: row.domain_id,
    createdAt: new Date(row.created_at),
    readCount: row.read_count,
    lastReadAt: row.last_read_at ? new Date(row.last_read_at) : null,
    recallStability: row.recall_stability,
    recallDifficulty: row.recall_difficulty,
    reviewRecallCount: row.review_recall_count,
    lastReviewRecallAt: row.last_review_recall_at ? new Date(row.last_review_recall_at) : null,
    quizKnowledgePosterior: row.quiz_knowledge_posterior,
    quizTestCount: row.quiz_test_count,
    lastQuizTestedAt: row.last_quiz_tested_at ? new Date(row.last_quiz_tested_at) : null,
    everMasteredAt: row.ever_mastered_at ? new Date(row.ever_mastered_at) : null,
  }));
}

type TraceStateRow = {
  read_count: number;
  last_read_at: string | null;
  recall_stability: number | null;
  recall_difficulty: number | null;
  review_recall_count: number;
  last_review_recall_at: string | null;
  quiz_knowledge_posterior: number | null;
  quiz_test_count: number;
  last_quiz_tested_at: string | null;
};

function mapTraceStateRow(row: TraceStateRow) {
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

/** One term's current state, read before applying a Review grade or Quiz
 *  answer — the FSRS-5/Bayesian math needs the prior S/D/posterior in TS. */
export async function fetchTraceState(client: Client, termId: string) {
  const { data, error } = await client.rpc("my_get_trace_state_for_term", { p_term_id: termId });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error(`Trace state missing for ${termId}`);
  return mapTraceStateRow(row);
}

/** Service-role counterpart of {@link fetchTraceState} (Telegram). */
export async function fetchTraceStateForUser(client: Client, userId: string, termId: string) {
  const { data, error } = await client.rpc("get_trace_state_for_term", {
    p_user_id: userId,
    p_term_id: termId,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error(`Trace state missing for ${termId}`);
  return mapTraceStateRow(row);
}

export async function fetchTraceCandidates(
  client: Client,
  _userId: string,
  scope: ReviewScope,
): Promise<TraceCandidate[]> {
  const { data, error } = await client.rpc("my_get_trace_candidates", {
    p_domain_ids: scope.domainIds === "all" ? undefined : scope.domainIds,
  });

  if (error) throw error;
  return mapCandidateRows(data ?? []);
}

/** Service-role / admin client: candidates for an explicit userId. */
export async function fetchTraceCandidatesForUser(
  client: Client,
  userId: string,
  scope: ReviewScope,
): Promise<TraceCandidate[]> {
  const { data, error } = await client.rpc("get_trace_candidates", {
    p_user_id: userId,
    p_domain_ids: scope.domainIds === "all" ? undefined : scope.domainIds,
  });

  if (error) throw error;
  return mapCandidateRows(data ?? []);
}

export type TraceEventPayload = {
  recallStability?: number;
  recallDifficulty?: number;
  quizKnowledgePosterior?: number;
  /** Set when this event's post-event Mastery_adjusted crosses the known
   *  threshold — drives the ever_mastered_at high-water mark (doc §8). SQL
   *  only sets it once and never clears it; the threshold itself lives in
   *  lib/trace, not duplicated here. */
  crossedKnownThreshold?: boolean;
};

/** Internal — only review-outcome should call these. */
export async function recordTraceEvent(
  client: Client,
  termId: string,
  event: ReviewEvent,
  payload?: TraceEventPayload,
): Promise<void> {
  const { error } = await client.rpc("my_record_review_event", {
    p_term_id: termId,
    p_event: event,
    p_recall_stability: payload?.recallStability,
    p_recall_difficulty: payload?.recallDifficulty,
    p_quiz_knowledge_posterior: payload?.quizKnowledgePosterior,
    p_crossed_known_threshold: payload?.crossedKnownThreshold ?? false,
  });

  if (error) throw error;
}

/** Internal — only review-outcome should call these. */
export async function recordTraceEventForUser(
  client: Client,
  userId: string,
  termId: string,
  event: ReviewEvent,
  payload?: TraceEventPayload,
): Promise<void> {
  const { error } = await client.rpc("record_review_event", {
    p_user_id: userId,
    p_term_id: termId,
    p_event: event,
    p_recall_stability: payload?.recallStability,
    p_recall_difficulty: payload?.recallDifficulty,
    p_quiz_knowledge_posterior: payload?.quizKnowledgePosterior,
    p_crossed_known_threshold: payload?.crossedKnownThreshold ?? false,
  });

  if (error) throw error;
}

/** Internal — only review-outcome should call these. */
export async function bumpStreak(client: Client): Promise<void> {
  const { error } = await client.rpc("my_bump_streak");

  if (error) throw error;
}

/** Internal — only review-outcome should call these. */
export async function bumpStreakForUser(client: Client, userId: string): Promise<void> {
  const { error } = await client.rpc("bump_streak", {
    p_user_id: userId,
  });

  if (error) throw error;
}
