import { computeTraceSnapshot, type TraceState } from "@/lib/trace";

/** Raw row shape returned by the my_progress_state_by_domain /
 *  progress_state_by_domain RPCs — one row per (user, term) in the queried
 *  domains. Shared by collection-domain-tally.ts (tallies into per-domain
 *  counts) and known-state.ts (folds into term-id lists) so both stay on
 *  the exact same known/marked/mastered computation instead of drifting
 *  apart across two copies. */
export type ProgressStateRow = {
  term_id: string;
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

export type DomainProgressState = {
  knownTermIds: string[];
  /** Terms the user manually marked known — a separate, user-set signal
   *  from TRACE's earned `knownTermIds` label above. Never conflated. */
  markedKnownTermIds: string[];
  /** Terms with a permanent ever_mastered_at high-water mark — distinct
   *  from the live, decaying `knownTermIds` label above. */
  everMasteredTermIds: string[];
};

export function toTraceState(row: ProgressStateRow): TraceState {
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

/** Folds already-fetched progress rows into known/marked/mastered term-id
 *  lists for the given domains — the pure counterpart of
 *  collection-domain-tally.ts's tallyDomainStats, used wherever the caller
 *  already has the raw rows on hand and just needs them reshaped, without
 *  another round trip to my_progress_state_by_domain. */
export function foldProgressStateRows(
  domainIds: string[],
  rows: ProgressStateRow[],
): DomainProgressState {
  const domainSet = new Set(domainIds);
  const now = new Date();
  const knownTermIds: string[] = [];
  const markedKnownTermIds: string[] = [];
  const everMasteredTermIds: string[] = [];

  for (const row of rows) {
    if (!domainSet.has(row.domain_id)) continue;
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
