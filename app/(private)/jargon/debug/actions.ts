"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  fetchReviewCandidatesInScope,
  listScoredCandidates,
  listScoredQuizCandidates,
} from "@/lib/smart-queue/service";
import { computeOverallStrength, type OverallStrength } from "@/lib/smart-queue/strength";
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
    }));

    return { rows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load scored terms.";
    return { error: message };
  }
}

export type DebugStrengthRow = {
  termId: string;
  term: string;
  domainId: string;
  score: number;
  bucket: OverallStrength;
  bars: number;
  readCount: number;
  lastReadAt: string | null;
  reviewRecallCount: number;
  lastReviewRecallAt: string | null;
  reviewStreak: number;
  reviewFailCount: number;
  quizTestCount: number;
  lastQuizTestedAt: string | null;
  quizStreak: number;
  quizFailCount: number;
  knownAt: string | null;
};

/** Blended overall mastery per term — no pool/context split, mirrors
 *  computeOverallStrength's use on collection cards and the stats page.
 *  Both pools are combined here since the score is pool-agnostic (Quiz's
 *  known-pool-only structural cap is already baked into the formula). */
export async function listDebugStrengthTermsAction(
  domainIds: string[] | "all",
): Promise<{ rows?: DebugStrengthRow[]; error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view this." };
  }

  try {
    const [unknownCandidates, knownCandidates] = await Promise.all([
      fetchReviewCandidatesInScope(auth.supabase, auth.user.id, { domainIds }, "unknown"),
      fetchReviewCandidatesInScope(auth.supabase, auth.user.id, { domainIds }, "known"),
    ]);
    const candidates = [...unknownCandidates, ...knownCandidates];

    if (candidates.length === 0) {
      return { rows: [] };
    }

    const { data: terms, error: termsError } = await auth.supabase
      .from("terms")
      .select("id, term")
      .in(
        "id",
        candidates.map((candidate) => candidate.termId),
      );

    if (termsError) throw termsError;

    const termNameById = new Map(terms.map((term) => [term.id, term.term]));
    const now = new Date();

    const rows: DebugStrengthRow[] = candidates
      .map((candidate) => {
        const { score, bucket, bars } = computeOverallStrength(candidate, now);
        return {
          termId: candidate.termId,
          term: termNameById.get(candidate.termId) ?? "(deleted term)",
          domainId: candidate.domainId,
          score,
          bucket,
          bars,
          readCount: candidate.readCount,
          lastReadAt: candidate.lastReadAt ? candidate.lastReadAt.toISOString() : null,
          reviewRecallCount: candidate.reviewRecallCount,
          lastReviewRecallAt: candidate.lastReviewRecallAt
            ? candidate.lastReviewRecallAt.toISOString()
            : null,
          reviewStreak: candidate.reviewStreak,
          reviewFailCount: candidate.reviewFailCount,
          quizTestCount: candidate.quizTestCount,
          lastQuizTestedAt: candidate.lastQuizTestedAt
            ? candidate.lastQuizTestedAt.toISOString()
            : null,
          quizStreak: candidate.quizStreak,
          quizFailCount: candidate.quizFailCount,
          knownAt: candidate.knownAt ? candidate.knownAt.toISOString() : null,
        };
      })
      .sort((a, b) => b.score - a.score || a.term.localeCompare(b.term));

    return { rows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load strength.";
    return { error: message };
  }
}
