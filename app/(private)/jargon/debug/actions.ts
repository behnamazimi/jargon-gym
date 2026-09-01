"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { listTraceCandidates } from "@/lib/trace-queue";
import type { PickContext, TraceCandidate } from "@/lib/trace-queue";
import type { Database } from "@/lib/supabase/database.types";
import { listStudyCollections } from "@/lib/study/collections";
import {
  computeTraceSnapshot,
  findAbandonedReveals,
  rankQuizQueue,
  rankReadQueue,
  rankReviewQueue,
  summarizeCalibration,
  computeAttentionFlag,
  type AbandonedReveal,
  type AttentionFlag,
  type CalibrationSummary,
  type KnownLabel,
  type TraceEventName,
} from "@/lib/trace";

type Client = SupabaseClient<Database>;

export async function getDebugSetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view this." };
  }

  const collections = await listStudyCollections(auth.supabase, auth.user.id);

  return { collections };
}

export type DebugScoredRow = {
  termId: string;
  term: string;
  domainId: string;
  readCount: number;
  lastReadAt: string | null;
  familiarity: number;
  reviewRecallCount: number;
  lastReviewRecallAt: string | null;
  recallStability: number | null;
  recallDifficulty: number | null;
  recallRetrievability: number | null;
  quizTestCount: number;
  lastQuizTestedAt: string | null;
  quizKnowledgePosterior: number | null;
  recognitionRetrievability: number | null;
  mastery: number;
  masteryAdjusted: number;
  knownLabel: KnownLabel;
  /** Recent-actual-vs-predicted mismatches — a term can carry one per
   *  track (recall, recognition) independently. Empty when nothing
   *  diverges enough to be worth a look, or there isn't enough recent
   *  history to trust the comparison yet. */
  attentionFlags: AttentionFlag[];
};

function rankForContext(
  candidates: TraceCandidate[],
  context: PickContext,
  now: Date,
): TraceCandidate[] {
  if (context === "read") return rankReadQueue(candidates);
  if (context === "review") return rankReviewQueue(candidates, now);
  return rankQuizQueue(candidates, now);
}

async function lookupTermNames(supabase: Client, termIds: string[]): Promise<Map<string, string>> {
  if (termIds.length === 0) return new Map();

  const { data: terms, error } = await supabase.from("terms").select("id, term").in("id", termIds);

  if (error) throw error;

  return new Map(terms.map((term) => [term.id, term.term]));
}

/** How many of a term's most recent graded events per track feed the
 *  attention-flag comparison — recent enough to reflect "is this term
 *  behaving the way its current state claims right now." */
const ATTENTION_LOOKBACK = 5;

type RecentEventRow = {
  term_id: string;
  event: TraceEventName;
  retrievability_before: number | null;
};

/** One bulk query for every candidate's recent pass/fail events — not
 *  N+1. PostgREST can't do "top N per group" in one call without a view
 *  or RPC, so this fetches every matching row and slices per term in JS;
 *  fine at this app's volume, a known seam if any term ever accumulates
 *  hundreds of grades. */
async function fetchRecentEventsByTerm(
  supabase: Client,
  termIds: string[],
): Promise<Map<string, RecentEventRow[]>> {
  if (termIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("review_events")
    .select("term_id, event, retrievability_before")
    .in("term_id", termIds)
    .in("event", ["review_pass", "review_fail", "quiz_pass", "quiz_fail"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  const byTerm = new Map<string, RecentEventRow[]>();
  for (const row of data ?? []) {
    const list = byTerm.get(row.term_id) ?? [];
    list.push(row);
    byTerm.set(row.term_id, list);
  }
  return byTerm;
}

function attentionFlagsForTerm(events: RecentEventRow[] | undefined): AttentionFlag[] {
  if (!events) return [];

  const recall = events
    .filter((e) => e.event === "review_pass" || e.event === "review_fail")
    .slice(0, ATTENTION_LOOKBACK)
    .map((e) => ({
      retrievabilityBefore: e.retrievability_before,
      passed: e.event === "review_pass",
    }));

  const recognition = events
    .filter((e) => e.event === "quiz_pass" || e.event === "quiz_fail")
    .slice(0, ATTENTION_LOOKBACK)
    .map((e) => ({
      retrievabilityBefore: e.retrievability_before,
      passed: e.event === "quiz_pass",
    }));

  const flags = [
    computeAttentionFlag("recall", recall),
    computeAttentionFlag("recognition", recognition),
  ];
  return flags.filter((flag): flag is AttentionFlag => flag !== null);
}

/** One ranked list per tier — every tier now ranks the same single term
 *  set by its own retrievability, so there's no known/unknown split and no
 *  read-mode fallback to report. */
export async function listDebugScoredTermsAction(
  domainIds: string[] | "all",
  context: PickContext,
): Promise<{
  rows?: DebugScoredRow[];
  error?: string;
}> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view this." };
  }

  try {
    const candidates = await listTraceCandidates(auth.supabase, auth.user.id, { domainIds });
    if (candidates.length === 0) return { rows: [] };

    const now = new Date();
    const ranked = rankForContext(candidates, context, now);
    return { rows: await hydrateDebugRows(auth.supabase, ranked, now) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load candidate terms.";
    return { error: message };
  }
}

async function hydrateDebugRows(
  supabase: Client,
  candidates: TraceCandidate[],
  now: Date,
): Promise<DebugScoredRow[]> {
  if (candidates.length === 0) return [];

  const termIds = candidates.map((candidate) => candidate.termId);
  const [termNameById, recentEventsByTerm] = await Promise.all([
    lookupTermNames(supabase, termIds),
    fetchRecentEventsByTerm(supabase, termIds),
  ]);

  return candidates.map((candidate) => {
    const snapshot = computeTraceSnapshot(candidate, now);
    return {
      termId: candidate.termId,
      term: termNameById.get(candidate.termId) ?? "(deleted term)",
      domainId: candidate.domainId,
      readCount: candidate.readCount,
      lastReadAt: candidate.lastReadAt ? candidate.lastReadAt.toISOString() : null,
      familiarity: snapshot.familiarity,
      reviewRecallCount: candidate.reviewRecallCount,
      lastReviewRecallAt: candidate.lastReviewRecallAt
        ? candidate.lastReviewRecallAt.toISOString()
        : null,
      recallStability: candidate.recallStability,
      recallDifficulty: candidate.recallDifficulty,
      recallRetrievability: snapshot.recallRetrievability,
      quizTestCount: candidate.quizTestCount,
      lastQuizTestedAt: candidate.lastQuizTestedAt
        ? candidate.lastQuizTestedAt.toISOString()
        : null,
      quizKnowledgePosterior: candidate.quizKnowledgePosterior,
      recognitionRetrievability: snapshot.recognitionRetrievability,
      mastery: snapshot.mastery,
      masteryAdjusted: snapshot.masteryAdjusted,
      knownLabel: snapshot.knownLabel,
      attentionFlags: attentionFlagsForTerm(recentEventsByTerm.get(candidate.termId)),
    };
  });
}

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

  const { data, error } = await auth.supabase
    .from("review_events")
    .select(
      "id, event, grade, question_type, retrievability_before, recall_stability, recall_difficulty, quiz_knowledge_posterior, created_at",
    )
    .eq("term_id", termId)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };

  return {
    rows: data.map((row) => ({
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
  };
}

export type CalibrationViewData = {
  recall: CalibrationSummary;
  recognition: CalibrationSummary;
  abandonedReveals: Array<AbandonedReveal & { term: string }>;
};

/** Global on purpose — calibration is a question about the algorithm, not
 *  one collection, and this is scoped to whichever single account is
 *  currently logged in (session client, RLS: auth.uid() = user_id) — the
 *  UI should say so, this isn't an aggregate across users. */
export async function getCalibrationSummaryAction(): Promise<{
  data?: CalibrationViewData;
  error?: string;
}> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view this." };
  }

  const { data: events, error } = await auth.supabase
    .from("review_events")
    .select("term_id, event, retrievability_before, created_at")
    .in("event", ["reveal", "review_pass", "review_fail", "quiz_pass", "quiz_fail"]);

  if (error) return { error: error.message };

  const rows = events ?? [];

  const recallRows = rows
    .filter((e) => e.event === "review_pass" || e.event === "review_fail")
    .map((e) => ({
      retrievabilityBefore: e.retrievability_before,
      passed: e.event === "review_pass",
    }));

  const recognitionRows = rows
    .filter((e) => e.event === "quiz_pass" || e.event === "quiz_fail")
    .map((e) => ({
      retrievabilityBefore: e.retrievability_before,
      passed: e.event === "quiz_pass",
    }));

  const revealSequenceRows = rows
    .filter((e) => e.event === "reveal" || e.event === "review_pass" || e.event === "review_fail")
    .map((e) => ({ termId: e.term_id, event: e.event, createdAt: new Date(e.created_at) }));

  const abandoned = findAbandonedReveals(revealSequenceRows, { now: new Date() }).slice(0, 10);

  const termNameById = await lookupTermNames(auth.supabase, [
    ...new Set(abandoned.map((a) => a.termId)),
  ]);

  return {
    data: {
      recall: summarizeCalibration(recallRows),
      recognition: summarizeCalibration(recognitionRows),
      abandonedReveals: abandoned.map((a) => ({
        ...a,
        term: termNameById.get(a.termId) ?? "(deleted term)",
      })),
    },
  };
}
