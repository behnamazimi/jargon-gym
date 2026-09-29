"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import type { TraceEventName } from "@/lib/trace";

export type DebugEventRow = {
  id: string;
  event: TraceEventName;
  grade: number | null;
  questionType: string | null;
  retrievabilityBefore: number | null;
  recallStability: number | null;
  recallDifficulty: number | null;
  quizKnowledgePosterior: number | null;
  createdAt: string;
};

/** PostgREST caps rows per request (project default is 1000) regardless of
 *  an explicit .order() — a term with a longer history than that would
 *  silently lose its most recent events to the cap. Page through with
 *  .range() so the full history always comes back. */
const EVENT_HISTORY_PAGE_SIZE = 1000;

/** One term's full event history, oldest first — the drill-down behind
 *  each row in the Queue view. RLS (authenticated: select own rows only)
 *  scopes this to the caller automatically, same as every other
 *  session-mode read on this page — no extra user_id filter needed. */
export async function getTermEventHistoryAction(
  termId: string,
): Promise<{ rows?: DebugEventRow[]; error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view this." };
  }

  const rows: DebugEventRow[] = [];
  for (let page = 0; ; page++) {
    const from = page * EVENT_HISTORY_PAGE_SIZE;
    const to = from + EVENT_HISTORY_PAGE_SIZE - 1;

    const { data, error } = await auth.supabase
      .from("review_events")
      .select(
        "id, event, grade, question_type, retrievability_before, recall_stability, recall_difficulty, quiz_knowledge_posterior, created_at",
      )
      .eq("term_id", termId)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) return { error: error.message };

    rows.push(
      ...data.map((row) => ({
        id: row.id,
        event: row.event,
        grade: row.grade,
        questionType: row.question_type,
        retrievabilityBefore: row.retrievability_before,
        recallStability: row.recall_stability,
        recallDifficulty: row.recall_difficulty,
        quizKnowledgePosterior: row.quiz_knowledge_posterior,
        createdAt: row.created_at,
      })),
    );

    if (data.length < EVENT_HISTORY_PAGE_SIZE) break;
  }

  return { rows };
}
