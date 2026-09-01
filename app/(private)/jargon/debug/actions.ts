"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { listTraceCandidates } from "@/lib/trace-queue";
import type { PickContext, TraceCandidate } from "@/lib/trace-queue";
import type { Database } from "@/lib/supabase/database.types";
import { listStudyCollections } from "@/lib/study/collections";
import {
  computeTraceSnapshot,
  rankQuizQueue,
  rankReadQueue,
  rankReviewQueue,
  type KnownLabel,
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

  const { data: terms, error: termsError } = await supabase
    .from("terms")
    .select("id, term")
    .in(
      "id",
      candidates.map((candidate) => candidate.termId),
    );

  if (termsError) throw termsError;

  const termNameById = new Map(terms.map((term) => [term.id, term.term]));

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
    };
  });
}
