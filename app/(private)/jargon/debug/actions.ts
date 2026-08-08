"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  listScoredCandidates,
  loadUserPreset,
  type PickReason,
  type ReviewOutcome,
  type ReviewPreset,
  type ReviewShownOrigin,
} from "@/lib/smart-queue";
import { listStudyCollections, type TermPoolStatus } from "@/lib/study";

export async function getDebugSetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view this." };
  }

  const [collections, defaultPreset] = await Promise.all([
    listStudyCollections(auth.supabase, auth.user.id),
    loadUserPreset(auth.supabase, auth.user.id),
  ]);

  return { collections, defaultPreset };
}

export type DebugScoredRow = {
  termId: string;
  term: string;
  domainId: string;
  score: number;
  reasons: PickReason[];
  seenCount: number;
  readCount: number;
  recalledCount: number;
  lastOutcome: ReviewOutcome;
  lastSeenAt: string | null;
  lastRecalledOutcome: ReviewOutcome | null;
  lastRecalledAt: string | null;
  lastShownOrigin: ReviewShownOrigin | null;
  failStreak: number;
};

export async function listDebugScoredTermsAction(
  domainIds: string[] | "all",
  status: TermPoolStatus,
  preset: ReviewPreset,
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
      preset,
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
      seenCount: candidate.seenCount,
      readCount: candidate.readCount,
      recalledCount: candidate.recalledCount,
      lastOutcome: candidate.lastOutcome,
      lastSeenAt: candidate.lastSeenAt ? candidate.lastSeenAt.toISOString() : null,
      lastRecalledOutcome: candidate.lastRecalledOutcome,
      lastRecalledAt: candidate.lastRecalledAt ? candidate.lastRecalledAt.toISOString() : null,
      lastShownOrigin: candidate.lastShownOrigin,
      failStreak: candidate.failStreak,
    }));

    return { rows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load scored terms.";
    return { error: message };
  }
}
