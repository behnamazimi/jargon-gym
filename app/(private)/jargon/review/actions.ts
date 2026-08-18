"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyReviewRating } from "@/lib/jargon/review-outcome";
import { MAX_REVIEW_TERMS, fetchReviewTermPool } from "@/lib/review/terms";
import type { ReviewSetup } from "@/lib/review/types";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import type { Database } from "@/lib/supabase/database.types";
import { listStudyCollections } from "@/lib/study/collections";
import { getMixedReviewPoolStats } from "@/lib/smart-queue/service";

export async function getReviewSetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." };
  }

  const collections = await listStudyCollections(auth.supabase, auth.user.id);

  return { collections };
}

export async function getReviewPoolStatsAction(domainIds: string[] | "all") {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." };
  }

  try {
    const poolStats = await getMixedReviewPoolStats(auth.supabase, auth.user.id, { domainIds });
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

/** Preview the next queue batch without starting a session. */
export async function previewReviewQueueAction(setup: ReviewSetup) {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." };
  }

  try {
    const result = await loadReviewCards(setup, auth.user.id, auth.supabase);
    if ("error" in result) {
      return { error: result.error };
    }
    return {
      preview: result.cards.map((card) => ({
        id: card.id,
        term: card.term,
        pickReasons: card.pickReasons,
        originStatus: card.originStatus,
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load queue preview.";
    return { error: message };
  }
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

export async function rateReviewTermAction(
  termId: string,
  known: boolean,
  originStatus: "known" | "unknown",
) {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." };
  }

  try {
    await applyReviewRating(auth.supabase, auth.user.id, {
      termId,
      known,
      sessionStatus: originStatus,
      mode: "session",
    });

    revalidatePath("/jargon");
    revalidatePath("/jargon/review");

    return {};
  } catch (err) {
    console.error("rateReviewTermAction failed", { termId, known, originStatus, err });
    const message = err instanceof Error ? err.message : "Couldn't save your rating. Try again.";
    return { error: message };
  }
}
