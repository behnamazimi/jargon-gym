import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { computeTraceSnapshot, type TraceState } from "@/lib/trace";
import type { CollectionRow } from "./collections";

type Client = SupabaseClient<Database>;

type ProgressStateRow = {
  collection_id: string;
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
type CollectionStats = {
  termCount: number;
  unfinishedCount: number;
  knownCount: number;
  termsLearnedCount: number;
  markedKnownCount: number;
};

function tallyCollectionStats(collectionIds: string[], data: ProgressStateRow[]) {
  const stats = new Map<string, CollectionStats>();
  const now = new Date();

  for (const collectionId of collectionIds) {
    stats.set(collectionId, {
      termCount: 0,
      unfinishedCount: 0,
      knownCount: 0,
      termsLearnedCount: 0,
      markedKnownCount: 0,
    });
  }

  for (const row of data) {
    const current = stats.get(row.collection_id);
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

export async function fetchCollectionStats(client: Client, collectionIds: string[]) {
  if (collectionIds.length === 0) return tallyCollectionStats(collectionIds, []);

  const [progress, unfinished] = await Promise.all([
    fetchAllRows((from, to) =>
      client
        .rpc("my_progress_state_by_collection", { p_collection_ids: collectionIds })
        .order("term_id")
        .range(from, to),
    ),
    client.rpc("my_unfinished_term_counts", { p_collection_ids: collectionIds }),
  ]);

  if (unfinished.error) throw unfinished.error;

  const stats = tallyCollectionStats(collectionIds, progress);
  for (const row of unfinished.data) {
    const current = stats.get(row.collection_id);
    if (current) current.unfinishedCount = row.unfinished_count;
  }
  return stats;
}

/** Service-role / admin client: stats for an explicit userId (no `auth.uid()` session). */
export async function fetchCollectionStatsForUser(
  client: Client,
  userId: string,
  collectionIds: string[],
) {
  if (collectionIds.length === 0) return tallyCollectionStats(collectionIds, []);

  const data = await fetchAllRows((from, to) =>
    client
      .rpc("progress_state_by_collection", { p_user_id: userId, p_collection_ids: collectionIds })
      .order("term_id")
      .range(from, to),
  );
  return tallyCollectionStats(collectionIds, data);
}

export function applyCollectionStats<T extends { id: string }>(
  rows: T[],
  stats: Map<string, CollectionStats>,
): (T & CollectionRow)[] {
  return rows.map((row) => {
    const collectionStats = stats.get(row.id) ?? {
      termCount: 0,
      unfinishedCount: 0,
      knownCount: 0,
      termsLearnedCount: 0,
      markedKnownCount: 0,
    };
    return {
      ...row,
      termCount: collectionStats.termCount,
      unfinishedCount: collectionStats.unfinishedCount,
      knownCount: collectionStats.knownCount,
      termsLearnedCount: collectionStats.termsLearnedCount,
      markedKnownCount: collectionStats.markedKnownCount,
    } as T & CollectionRow;
  });
}
