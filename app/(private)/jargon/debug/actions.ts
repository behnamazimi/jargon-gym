"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { getReadMode } from "@/lib/jargon/read-settings";
import { listCandidates, listMixedReviewCandidates } from "@/lib/smart-queue/service";
import type { FailSource, PickContext, ReviewCandidate } from "@/lib/smart-queue/types";
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
  knownCount: number;
  unknownCount: number;
};

/** No status param — there's no user-facing pool toggle anymore. Read is
 *  unknown-first (falling back to the known pool, unordered, when
 *  read_mode === "stale_known" and the unknown pool is empty — see
 *  readFallbackActive), Quiz is always the known pool, Review blends both
 *  (see listMixedReviewCandidates). */
export async function listDebugScoredTermsAction(
  domainIds: string[] | "all",
  context: PickContext,
): Promise<{
  rows?: DebugScoredRow[];
  mix?: DebugReviewMixInfo;
  /** Read only: true when the unknown pool was empty and these rows are the
   *  known-pool fallback instead. */
  readFallbackActive?: boolean;
  error?: string;
}> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view this." };
  }

  try {
    if (context === "quiz") {
      const candidates = await listCandidates(auth.supabase, auth.user.id, { domainIds }, "known");
      return { rows: await hydrateDebugRows(auth.supabase, candidates) };
    }

    if (context === "review") {
      const {
        rows: candidates,
        knownCount,
        unknownCount,
      } = await listMixedReviewCandidates(auth.supabase, auth.user.id, { domainIds });
      const rows = await hydrateDebugRows(auth.supabase, candidates, true);
      return {
        rows,
        mix: { knownCount, unknownCount },
      };
    }

    const candidates = await listCandidates(auth.supabase, auth.user.id, { domainIds }, "unknown");

    if (candidates.length > 0) {
      return { rows: await hydrateDebugRows(auth.supabase, candidates) };
    }

    // Unknown pool empty: mirror getNextReadTermAction's own fallback check
    // so this view shows exactly what Read would actually serve next.
    const readMode = await getReadMode(auth.supabase, auth.user.id);
    if (readMode !== "stale_known") {
      return { rows: [] };
    }

    const known = await listCandidates(auth.supabase, auth.user.id, { domainIds }, "known");
    return {
      rows: await hydrateDebugRows(auth.supabase, known, true),
      readFallbackActive: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load candidate terms.";
    return { error: message };
  }
}

async function hydrateDebugRows(
  supabase: Client,
  candidates: ReviewCandidate[],
  tagOrigin = false,
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

  return candidates.map((candidate) => ({
    termId: candidate.termId,
    term: termNameById.get(candidate.termId) ?? "(deleted term)",
    domainId: candidate.domainId,
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
