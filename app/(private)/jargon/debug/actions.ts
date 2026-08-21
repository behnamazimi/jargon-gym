"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  listScoredCandidates,
  listScoredMixedReviewCandidates,
  listScoredQuizCandidates,
} from "@/lib/smart-queue/service";
import { buildRotationInsight, type RotationPoolInsight } from "@/lib/smart-queue/rotation-insight";
import type { FailSource, PickContext, PickReason } from "@/lib/smart-queue/types";
import { RANKING } from "@/lib/smart-queue/weights";
import type { Database } from "@/lib/supabase/database.types";
import { listStudyCollections } from "@/lib/study/collections";
import type { TermPoolStatus } from "@/lib/study/types";

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
  /** Review only: which pool this term was drawn from. */
  originStatus?: TermPoolStatus;
};

export type DebugReviewMixInfo = {
  knownSlots: number;
  unknownSlots: number;
  knownCount: number;
  unknownCount: number;
};

/** No status param — there's no user-facing pool toggle anymore. Read is
 *  always the unknown pool, Quiz is always the known pool, Review blends
 *  both (see listScoredMixedReviewCandidates). */
export async function listDebugScoredTermsAction(
  domainIds: string[] | "all",
  context: PickContext,
): Promise<{
  rows?: DebugScoredRow[];
  mix?: DebugReviewMixInfo;
  insight?: RotationPoolInsight[];
  error?: string;
}> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view this." };
  }

  try {
    if (context === "quiz") {
      const scored = await listScoredQuizCandidates(auth.supabase, auth.user.id, { domainIds });
      return {
        rows: await hydrateDebugRows(auth.supabase, scored),
        insight: buildRotationInsight(scored, context),
      };
    }

    if (context === "review") {
      const {
        rows: scored,
        knownCount,
        unknownCount,
      } = await listScoredMixedReviewCandidates(auth.supabase, auth.user.id, { domainIds });
      const rows = await hydrateDebugRows(auth.supabase, scored, true);
      return {
        rows,
        mix: {
          knownSlots: RANKING.reviewMix.knownSlots,
          unknownSlots: RANKING.reviewMix.unknownSlots,
          knownCount,
          unknownCount,
        },
        insight: buildRotationInsight(scored, context),
      };
    }

    const scored = await listScoredCandidates(
      auth.supabase,
      auth.user.id,
      { domainIds },
      "unknown",
      context,
    );
    return {
      rows: await hydrateDebugRows(auth.supabase, scored),
      insight: buildRotationInsight(scored, context),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load scored terms.";
    return { error: message };
  }
}

async function hydrateDebugRows(
  supabase: Client,
  scored: Array<{
    termId: string;
    domainId: string;
    score: number;
    reasons: PickReason[];
    readCount: number;
    lastReadAt: Date | null;
    reviewRecallCount: number;
    lastReviewRecallAt: Date | null;
    reviewStreak: number;
    quizTestCount: number;
    lastQuizTestedAt: Date | null;
    quizStreak: number;
    pendingReveal: boolean;
    lastFailAt: Date | null;
    lastFailSource: FailSource | null;
    reviewFailCount: number;
    quizFailCount: number;
    knownAt: Date | null;
  }>,
  tagOrigin = false,
): Promise<DebugScoredRow[]> {
  if (scored.length === 0) return [];

  const { data: terms, error: termsError } = await supabase
    .from("terms")
    .select("id, term")
    .in(
      "id",
      scored.map((candidate) => candidate.termId),
    );

  if (termsError) throw termsError;

  const termNameById = new Map(terms.map((term) => [term.id, term.term]));

  return scored.map((candidate) => ({
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
    lastQuizTestedAt: candidate.lastQuizTestedAt ? candidate.lastQuizTestedAt.toISOString() : null,
    quizStreak: candidate.quizStreak,
    pendingReveal: candidate.pendingReveal,
    lastFailAt: candidate.lastFailAt ? candidate.lastFailAt.toISOString() : null,
    lastFailSource: candidate.lastFailSource,
    reviewFailCount: candidate.reviewFailCount,
    quizFailCount: candidate.quizFailCount,
    originStatus: tagOrigin ? (candidate.knownAt !== null ? "known" : "unknown") : undefined,
  }));
}
