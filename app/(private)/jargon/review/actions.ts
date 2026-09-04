"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyReviewGrade } from "@/lib/jargon/review-outcome";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { MAX_REVIEW_TERMS, fetchReviewTermPool } from "@/lib/review/terms";
import type { ReviewSetup } from "@/lib/review/types";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import type { Database } from "@/lib/supabase/database.types";
import { listStudyCollections } from "@/lib/study/collections";
import { getPoolStats } from "@/lib/trace-queue";
import type { ReviewGrade } from "@/lib/trace";

export async function getReviewSetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." };
  }

  const [collections, narrationAccess] = await Promise.all([
    listStudyCollections(auth.supabase, auth.user.id),
    getNarrationAccessForUser(auth.supabase, auth.user.id),
  ]);

  return { collections, narrationAccess };
}

export async function getReviewPoolStatsAction(domainIds: string[] | "all") {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." };
  }

  try {
    const poolStats = await getPoolStats(auth.supabase, auth.user.id, { domainIds }, "review");
    return { poolStats };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load pool stats.";
    return { error: message };
  }
}

async function loadReviewCards(
  setup: ReviewSetup,
  userId: string,
  supabase: SupabaseClient<Database>,
) {
  const cardCount = Math.floor(setup.cardCount);
  if (!Number.isFinite(cardCount) || cardCount < 1) {
    return { error: "Choose at least one card." as const };
  }

  if (cardCount > MAX_REVIEW_TERMS) {
    return { error: `Review sessions are limited to ${MAX_REVIEW_TERMS} cards.` as const };
  }

  const cards = await fetchReviewTermPool(supabase, userId, setup.domainIds, cardCount);

  if (cards.length === 0) {
    return {
      error: "No terms match your selection. Try a different collection." as const,
    };
  }

  return { cards };
}

export async function startReviewAction(setup: ReviewSetup) {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." };
  }

  try {
    const result = await loadReviewCards(setup, auth.user.id, auth.supabase);
    if ("error" in result) {
      return { error: result.error };
    }
    return { cards: result.cards };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't start the review. Try again.";
    return { error: message };
  }
}

export async function rateReviewTermAction(termId: string, grade: ReviewGrade) {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." };
  }

  try {
    await applyReviewGrade(auth.supabase, auth.user.id, {
      termId,
      grade,
      mode: "session",
    });

    revalidatePath("/jargon");
    revalidatePath("/jargon/review");

    return {};
  } catch (err) {
    console.error("rateReviewTermAction failed", { termId, grade, err });
    const message = err instanceof Error ? err.message : "Couldn't save your rating. Try again.";
    return { error: message };
  }
}
