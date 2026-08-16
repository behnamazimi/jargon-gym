"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { listScoredCandidates, listScoredQuizCandidates } from "@/lib/smart-queue/service";
import { strengthForCandidate, type Strength } from "@/lib/smart-queue/strength";
import type { FailSource, PickContext, PickReason } from "@/lib/smart-queue/types";
import { listStudyCollections } from "@/lib/study/collections";
import type { TermPoolStatus } from "@/lib/study/types";

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
  reviewFailCount: number;
  quizFailCount: number;
  reviewStrength: Strength;
  quizStrength: Strength;
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
    const scored =
      context === "quiz"
        ? await listScoredQuizCandidates(auth.supabase, auth.user.id, { domainIds })
        : await listScoredCandidates(auth.supabase, auth.user.id, { domainIds }, status, context);

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
    const now = new Date();

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
      reviewFailCount: candidate.reviewFailCount,
      quizFailCount: candidate.quizFailCount,
      reviewStrength: strengthForCandidate(candidate, "review", now)!,
      quizStrength: strengthForCandidate(candidate, "quiz", now)!,
    }));

    return { rows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load scored terms.";
    return { error: message };
  }
}
