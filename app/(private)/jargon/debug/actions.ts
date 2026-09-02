"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { listTraceCandidates } from "@/lib/trace-queue";
import type { PickContext, TraceCandidate } from "@/lib/trace-queue";
import type { Database } from "@/lib/supabase/database.types";
import { listStudyCollections } from "@/lib/study/collections";
import {
  computeTraceSnapshot,
  daysUntilCooldownClears,
  findAbandonedReveals,
  rankQuizQueue,
  rankReadQueue,
  rankReviewQueue,
  summarizeActivityTimeline,
  summarizeCalibration,
  summarizeGradeDistribution,
  computeAttentionFlag,
  computeCrossTrackFlag,
  type AbandonedReveal,
  type ActivityDay,
  type AttentionFlag,
  type CalibrationSummary,
  type CrossTrackFlag,
  type KnownLabel,
  type ReviewGrade,
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

type PassFailCounts = { passes: number; fails: number };

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
  /** First moment this term's Mastery_adjusted ever crossed the known
   *  threshold — a permanent high-water mark, unlike knownLabel above,
   *  which decays with the live score. Null if it's never happened. */
  everMasteredAt: string | null;
  /** Full pass/fail history per track, not just the last few — distinct
   *  from attentionFlags below, which only look at a recent slice. */
  recallPassFailCounts: PassFailCounts;
  recognitionPassFailCounts: PassFailCounts;
  /** Recent-actual-vs-predicted mismatches — a term can carry one per
   *  track (recall, recognition) independently. Empty when nothing
   *  diverges enough to be worth a look, or there isn't enough recent
   *  history to trust the comparison yet. */
  attentionFlags: AttentionFlag[];
  /** Set when this term's two live retrievabilities — not a prediction
   *  check like attentionFlags, a comparison between them — disagree
   *  sharply right now. */
  crossTrackFlag: CrossTrackFlag | null;
  /** Days until this term's retrievability in the selected context's track
   *  decays back under the session cooldown threshold — non-null only for
   *  a term currently excluded from the ranked queue because it was just
   *  graded. Null for Read (cooldown doesn't apply), an untested track, or
   *  a term that's already eligible. */
  daysUntilEligible: number | null;
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

/** Full pass/fail counts per track, over the same event list attention
 *  flags read from — but unsliced, since this is "how has this term done
 *  overall," not "how has it done lately." */
function passFailCountsForTerm(events: RecentEventRow[] | undefined): {
  recall: PassFailCounts;
  recognition: PassFailCounts;
} {
  const counts = {
    recall: { passes: 0, fails: 0 },
    recognition: { passes: 0, fails: 0 },
  };
  for (const event of events ?? []) {
    if (event.event === "review_pass") counts.recall.passes += 1;
    else if (event.event === "review_fail") counts.recall.fails += 1;
    else if (event.event === "quiz_pass") counts.recognition.passes += 1;
    else if (event.event === "quiz_fail") counts.recognition.fails += 1;
  }
  return counts;
}

/** One ranked list per tier — every tier now ranks the same single term
 *  set by its own retrievability, so there's no known/unknown split and no
 *  read-mode fallback to report.
 *
 *  Hydrates the FULL candidate set once (one lookupTermNames/
 *  fetchRecentEventsByTerm pass, not two) rather than only the ranked/
 *  filtered list, so a term excluded by the session cooldown — silently
 *  dropped by rankReviewQueue/rankQuizQueue — can still be reported back
 *  as `coolingDown` instead of just vanishing. The ranked set's termIds are
 *  the sole source of truth for the partition, so there's exactly one
 *  place deciding "is this excluded," not two that could drift. */
export async function listDebugScoredTermsAction(
  domainIds: string[] | "all",
  context: PickContext,
): Promise<{
  rows?: DebugScoredRow[];
  coolingDown?: DebugScoredRow[];
  error?: string;
}> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view this." };
  }

  try {
    const candidates = await listTraceCandidates(auth.supabase, auth.user.id, { domainIds });
    if (candidates.length === 0) return { rows: [], coolingDown: [] };

    const now = new Date();
    const ranked = rankForContext(candidates, context, now);
    const rankedIds = new Set(ranked.map((candidate) => candidate.termId));

    const hydrated = await hydrateDebugRows(auth.supabase, candidates, context, now);
    const hydratedById = new Map(hydrated.map((row) => [row.termId, row]));

    const rows = ranked.map((candidate) => hydratedById.get(candidate.termId)!);
    const coolingDown = hydrated
      .filter((row) => !rankedIds.has(row.termId))
      .sort((a, b) => (a.daysUntilEligible ?? Infinity) - (b.daysUntilEligible ?? Infinity));

    return { rows, coolingDown };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load candidate terms.";
    return { error: message };
  }
}

async function hydrateDebugRows(
  supabase: Client,
  candidates: TraceCandidate[],
  context: PickContext,
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
    const events = recentEventsByTerm.get(candidate.termId);
    const passFail = passFailCountsForTerm(events);
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
      everMasteredAt: candidate.everMasteredAt ? candidate.everMasteredAt.toISOString() : null,
      recallPassFailCounts: passFail.recall,
      recognitionPassFailCounts: passFail.recognition,
      attentionFlags: attentionFlagsForTerm(events),
      crossTrackFlag: computeCrossTrackFlag(
        snapshot.recallRetrievability,
        snapshot.recognitionRetrievability,
      ),
      daysUntilEligible:
        context === "read"
          ? null
          : daysUntilCooldownClears(
              candidate,
              context === "review" ? "recall" : "recognition",
              now,
            ),
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

/** How many days of recent `review_events` back the Activity table on the
 *  Calibration tab — see summarizeActivityTimeline's doc for why this is a
 *  separate, date-bounded query rather than reusing the all-time one below
 *  (that one deliberately excludes "read" events; this one needs them). */
const ACTIVITY_TIMELINE_DAYS = 14;

export type CalibrationViewData = {
  recall: CalibrationSummary;
  recognition: CalibrationSummary;
  abandonedReveals: Array<AbandonedReveal & { term: string }>;
  gradeDistribution: Record<ReviewGrade, number>;
  activityTimeline: ActivityDay[];
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

  const now = new Date();
  const activityWindowStart = new Date(
    now.getTime() - ACTIVITY_TIMELINE_DAYS * 24 * 60 * 60 * 1000,
  );

  const [{ data: events, error }, { data: recentEvents, error: recentEventsError }] =
    await Promise.all([
      auth.supabase
        .from("review_events")
        .select("term_id, event, grade, retrievability_before, created_at")
        .in("event", ["reveal", "review_pass", "review_fail", "quiz_pass", "quiz_fail"]),
      // Separate, date-bounded query — unlike the one above, this needs "read"
      // events too, and stays cheap by not going back further than the window.
      auth.supabase
        .from("review_events")
        .select("event, created_at")
        .gte("created_at", activityWindowStart.toISOString()),
    ]);

  if (error) return { error: error.message };
  if (recentEventsError) return { error: recentEventsError.message };

  const rows = events ?? [];

  const activityTimeline = summarizeActivityTimeline(
    (recentEvents ?? []).map((e) => ({ event: e.event, createdAt: new Date(e.created_at) })),
    { now, days: ACTIVITY_TIMELINE_DAYS },
  );

  const recallRows = rows
    .filter((e) => e.event === "review_pass" || e.event === "review_fail")
    .map((e) => ({
      retrievabilityBefore: e.retrievability_before,
      passed: e.event === "review_pass",
    }));

  const gradeDistribution = summarizeGradeDistribution(
    rows
      .filter((e) => e.event === "review_pass" || e.event === "review_fail")
      .map((e) => ({ grade: e.grade })),
  );

  const recognitionRows = rows
    .filter((e) => e.event === "quiz_pass" || e.event === "quiz_fail")
    .map((e) => ({
      retrievabilityBefore: e.retrievability_before,
      passed: e.event === "quiz_pass",
    }));

  const revealSequenceRows = rows
    .filter((e) => e.event === "reveal" || e.event === "review_pass" || e.event === "review_fail")
    .map((e) => ({ termId: e.term_id, event: e.event, createdAt: new Date(e.created_at) }));

  const abandoned = findAbandonedReveals(revealSequenceRows, { now }).slice(0, 10);

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
      gradeDistribution,
      activityTimeline,
    },
  };
}
