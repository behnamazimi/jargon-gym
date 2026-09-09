import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { computeTraceSnapshot, type TraceState } from "@/lib/trace";
import type { CollectionDomainRow } from "./collections";

type Client = SupabaseClient<Database>;

type ProgressStateRow = {
  domain_id: string;
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
  marked_known_at: string | null;
};

function toTraceState(row: ProgressStateRow): TraceState {
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

/** "known" is a read-only label derived live from Mastery_adjusted, not a
 *  stored row — replaces the old known_at-row-presence tally. `ever_mastered_at`
 *  is the companion permanent high-water mark: once set it's never cleared,
 *  even as the live label later decays back below the known threshold.
 *  `marked_known_at` is the user's own manual override — separate from both,
 *  but counted into `knownCount`/`termsLearnedCount` too since it reduces
 *  what's left to learn regardless of how it happened; `markedKnownCount`
 *  tracks it on its own for the Mastery page's "N marked known by you" line. */
function tallyDomainStats(domainIds: string[], data: ProgressStateRow[]) {
  const stats = new Map<
    string,
    { termCount: number; knownCount: number; termsLearnedCount: number; markedKnownCount: number }
  >();
  const now = new Date();

  for (const domainId of domainIds) {
    stats.set(domainId, { termCount: 0, knownCount: 0, termsLearnedCount: 0, markedKnownCount: 0 });
  }

  for (const row of data) {
    const current = stats.get(row.domain_id);
    if (!current) continue;
    current.termCount += 1;
    const markedKnown = row.marked_known_at !== null;
    if (computeTraceSnapshot(toTraceState(row), now).knownLabel === "known" || markedKnown) {
      current.knownCount += 1;
    }
    if (row.ever_mastered_at !== null || markedKnown) {
      current.termsLearnedCount += 1;
    }
    if (markedKnown) {
      current.markedKnownCount += 1;
    }
  }

  return stats;
}

export async function fetchDomainStats(client: Client, domainIds: string[]) {
  if (domainIds.length === 0) return tallyDomainStats(domainIds, []);

  const { data, error } = await client.rpc("my_progress_state_by_domain", {
    p_domain_ids: domainIds,
  });

  if (error) throw error;
  return tallyDomainStats(domainIds, data);
}

/** Service-role / admin client: stats for an explicit userId (no `auth.uid()` session). */
export async function fetchDomainStatsForUser(client: Client, userId: string, domainIds: string[]) {
  if (domainIds.length === 0) return tallyDomainStats(domainIds, []);

  const { data, error } = await client.rpc("progress_state_by_domain", {
    p_user_id: userId,
    p_domain_ids: domainIds,
  });

  if (error) throw error;
  return tallyDomainStats(domainIds, data);
}

export function applyDomainStats<T extends { id: string }>(
  rows: T[],
  stats: Map<
    string,
    { termCount: number; knownCount: number; termsLearnedCount: number; markedKnownCount: number }
  >,
): (T & CollectionDomainRow)[] {
  return rows.map((row) => {
    const domainStats = stats.get(row.id) ?? {
      termCount: 0,
      knownCount: 0,
      termsLearnedCount: 0,
      markedKnownCount: 0,
    };
    return {
      ...row,
      termCount: domainStats.termCount,
      knownCount: domainStats.knownCount,
      termsLearnedCount: domainStats.termsLearnedCount,
      markedKnownCount: domainStats.markedKnownCount,
    } as T & CollectionDomainRow;
  });
}
