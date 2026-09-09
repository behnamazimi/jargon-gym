"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { listTraceCandidates } from "@/lib/trace-queue";
import type { PickContext } from "@/lib/trace-queue";
import { listStudyCollections } from "@/lib/study/collections";
import { hydrateDebugRows, rankForContext } from "@/app/(private)/jargon/debug/debug-row-hydration";
import type { DebugScoredRow } from "@/app/(private)/jargon/debug/debug-row-types";

export type { DebugScoredRow } from "@/app/(private)/jargon/debug/debug-row-types";

export async function getDebugSetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view this." };
  }

  const collections = await listStudyCollections(auth.supabase, auth.user.id);

  return { collections };
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
