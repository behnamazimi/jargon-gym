"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { fetchStatsSnapshot } from "@/lib/jargon/collection-stats";
import { loadMasteryCounts, loadMasteryTermRows } from "@/lib/jargon/mastery";

export async function getMasterySetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view your mastery overview." as const };
  }

  const [{ collections, termsLearning, termsLearned }, stats] = await Promise.all([
    loadMasteryCounts(auth.supabase, auth.user.id),
    fetchStatsSnapshot(auth.supabase, auth.user.id),
  ]);

  return { collections, termsLearning, termsLearned, stats };
}

export async function getMasteryTermRowsAction() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view your mastery overview." as const };
  }

  try {
    const termRows = await loadMasteryTermRows(auth.supabase, auth.user.id);
    return { termRows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load terms.";
    return { error: message };
  }
}
