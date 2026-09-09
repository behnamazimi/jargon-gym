import type { SupabaseClient } from "@supabase/supabase-js";
import type { PickContext, TraceCandidate } from "@/lib/trace-queue";
import type { Database } from "@/lib/supabase/database.types";
import {
  computeAttentionFlag,
  computeCrossTrackFlag,
  computeReadExposure,
  computeReadTempering,
  computeTraceSnapshot,
  daysUntilCooldownClears,
  rankQuizQueue,
  rankReadQueue,
  rankReviewQueue,
  READ_TEMPER_WEIGHT,
  type AttentionFlag,
  type TraceEventName,
} from "@/lib/trace";
import type { DebugScoredRow, PassFailCounts } from "@/app/(private)/jargon/debug/debug-row-types";

type Client = SupabaseClient<Database>;

export function rankForContext(
  candidates: TraceCandidate[],
  context: PickContext,
  now: Date,
): TraceCandidate[] {
  if (context === "read") return rankReadQueue(candidates, now);
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

export async function hydrateDebugRows(
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
    const readExposure = computeReadExposure(candidate, now);
    const readTempering = computeReadTempering(candidate, now);
    const events = recentEventsByTerm.get(candidate.termId);
    const passFail = passFailCountsForTerm(events);
    return {
      termId: candidate.termId,
      term: termNameById.get(candidate.termId) ?? "(deleted term)",
      domainId: candidate.domainId,
      readCount: candidate.readCount,
      lastReadAt: candidate.lastReadAt ? candidate.lastReadAt.toISOString() : null,
      familiarity: snapshot.familiarity,
      readExposure,
      readTempering,
      readRankScore: readExposure + READ_TEMPER_WEIGHT * readTempering,
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
