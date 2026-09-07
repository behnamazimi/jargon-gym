"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { fetchStatsSnapshot } from "@/lib/jargon/collection-stats";
import { loadMasteryOverview } from "@/lib/jargon/mastery";

export async function getMasterySetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to view your mastery overview." as const };
  }

  const [{ collections, termsLearning, termsLearned, termRows }, stats] = await Promise.all([
    loadMasteryOverview(auth.supabase, auth.user.id),
    fetchStatsSnapshot(auth.supabase, auth.user.id),
  ]);

  return { collections, termsLearning, termsLearned, termRows, stats };
}
