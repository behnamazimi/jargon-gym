import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { QueueDebugTerm } from "./build";

type Client = SupabaseClient<Database>;

type DebugRow = {
  term_id: string;
  term: string;
  domain_id: string;
  domain_name: string;
  active: boolean;
  finished: boolean;
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
  ever_learning_at: string | null;
  marked_known_at: string | null;
};

const date = (value: string | null) => (value ? new Date(value) : null);

export function mapQueueDebugRows(data: Json): QueueDebugTerm[] {
  if (!Array.isArray(data)) throw new Error("Queue debug rows must be a JSON array.");
  return (data as DebugRow[]).map((row) => ({
    termId: row.term_id,
    term: row.term,
    domainId: row.domain_id,
    domainName: row.domain_name,
    active: row.active,
    finished: row.finished,
    createdAt: new Date(row.created_at),
    readCount: row.read_count,
    lastReadAt: date(row.last_read_at),
    recallStability: row.recall_stability,
    recallDifficulty: row.recall_difficulty,
    reviewRecallCount: row.review_recall_count,
    lastReviewRecallAt: date(row.last_review_recall_at),
    quizKnowledgePosterior: row.quiz_knowledge_posterior,
    quizTestCount: row.quiz_test_count,
    lastQuizTestedAt: date(row.last_quiz_tested_at),
    everMasteredAt: date(row.ever_mastered_at),
    everLearningAt: date(row.ever_learning_at),
    markedKnownAt: date(row.marked_known_at),
  }));
}

/** Every term in a member's collections, with its TRACE state. Needs an admin session. */
export async function loadQueueDebugTerms(client: Client, userId: string) {
  const { data, error } = await client.rpc("admin_queue_debug_terms", { p_user_id: userId });
  if (error) throw error;
  return mapQueueDebugRows(data);
}

/** The member's email, for the page header; null when the account doesn't exist. */
export async function loadMemberEmail(client: Client, userId: string): Promise<string | null> {
  const { data, error } = await client.from("users").select("email").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data?.email ?? null;
}
