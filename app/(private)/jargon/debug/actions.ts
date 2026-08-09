"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  listScoredCandidates,
  type FailSource,
  type PickContext,
  type PickReason,
} from "@/lib/smart-queue";
import { listStudyCollections, type TermPoolStatus } from "@/lib/study";

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
  score: number;
  reasons: PickReason[];
  readCount: number;
  lastReadAt: string | null;
  reviewRecallCount: number;
  lastReviewRecallAt: string | null;
  reviewStreak: number;
  quizTestCount: number;
  lastQuizTestedAt: string | null;
  quizStreak: number;
  pendingReveal: boolean;
  lastFailAt: string | null;
  lastFailSource: FailSource | null;
};

export async function listDebugScoredTermsAction(
  domainIds: string[] | "all",
  status: TermPoolStatus,
  context: PickContext,
): Promise<{ rows?: DebugScoredRow[]; error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view this." };
  }

  try {
    const scored = await listScoredCandidates(
      auth.supabase,
      auth.user.id,
      { domainIds },
      status,
      context,
    );

    if (scored.length === 0) {
      return { rows: [] };
    }

    const { data: terms, error: termsError } = await auth.supabase
      .from("terms")
      .select("id, term")
      .in(
        "id",
        scored.map((candidate) => candidate.termId),
      );

    if (termsError) throw termsError;

    const termNameById = new Map(terms.map((term) => [term.id, term.term]));

    const rows: DebugScoredRow[] = scored.map((candidate) => ({
      termId: candidate.termId,
      term: termNameById.get(candidate.termId) ?? "(deleted term)",
      domainId: candidate.domainId,
      score: candidate.score,
      reasons: candidate.reasons,
      readCount: candidate.readCount,
      lastReadAt: candidate.lastReadAt ? candidate.lastReadAt.toISOString() : null,
      reviewRecallCount: candidate.reviewRecallCount,
      lastReviewRecallAt: candidate.lastReviewRecallAt
        ? candidate.lastReviewRecallAt.toISOString()
        : null,
      reviewStreak: candidate.reviewStreak,
      quizTestCount: candidate.quizTestCount,
      lastQuizTestedAt: candidate.lastQuizTestedAt
        ? candidate.lastQuizTestedAt.toISOString()
        : null,
      quizStreak: candidate.quizStreak,
      pendingReveal: candidate.pendingReveal,
      lastFailAt: candidate.lastFailAt ? candidate.lastFailAt.toISOString() : null,
      lastFailSource: candidate.lastFailSource,
    }));

    return { rows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load scored terms.";
    return { error: message };
  }
}
