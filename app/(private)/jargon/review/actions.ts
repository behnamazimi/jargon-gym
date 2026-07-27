"use server";

import { revalidatePath } from "next/cache";
import { clearTermKnown, markTermKnown } from "@/lib/jargon/known-state";
import { listQuizableCollections } from "@/lib/quiz/terms";
import { MAX_REVIEW_TERMS, fetchReviewTermPool } from "@/lib/review/terms";
import type { ReviewSetup } from "@/lib/review/types";
import { createClient } from "@/lib/supabase/server";

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Log in to continue." as const };
  }

  return { supabase, user };
}

export async function getReviewSetupData() {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." };
  }

  const collections = await listQuizableCollections(auth.supabase, auth.user.id);

  return { collections };
}

export async function startReviewAction(setup: ReviewSetup) {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." };
  }

  try {
    const cardCount = Math.floor(setup.cardCount);
    if (!Number.isFinite(cardCount) || cardCount < 1) {
      return { error: "Choose at least one card." };
    }

    if (cardCount > MAX_REVIEW_TERMS) {
      return { error: `Review sessions are limited to ${MAX_REVIEW_TERMS} cards.` };
    }

    const cards = await fetchReviewTermPool(
      auth.supabase,
      auth.user.id,
      setup.domainIds,
      setup.status,
      cardCount,
      setup.shuffle,
    );

    if (cards.length === 0) {
      return { error: "No terms match your selection. Try a different collection or status." };
    }

    return { cards };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't start the review. Try again.";
    return { error: message };
  }
}

export async function rateReviewTermAction(termId: string, known: boolean) {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." };
  }

  try {
    if (known) {
      await markTermKnown(auth.supabase, termId);
    } else {
      await clearTermKnown(auth.supabase, auth.user.id, termId);
    }

    revalidatePath("/jargon");

    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't save your rating. Try again.";
    return { error: message };
  }
}
