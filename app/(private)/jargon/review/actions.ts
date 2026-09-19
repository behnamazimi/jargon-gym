"use server";

import { applyReviewGrade } from "@/lib/jargon/review-outcome";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { toReviewTerm } from "@/lib/review/mappers";
import { REVIEW_QUEUE_BUFFER_SIZE } from "@/lib/review/queue";
import type { ReviewTerm } from "@/lib/review/types";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { listStudyCollections } from "@/lib/study/collections";
import { pickReviewTermsForUser } from "@/lib/trace-queue";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReviewGrade } from "@/lib/trace";

export async function getReviewSetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." as const };
  }

  const [collections, narrationAccess] = await Promise.all([
    listStudyCollections(auth.supabase, auth.user.id),
    getNarrationAccessForUser(auth.supabase, auth.user.id),
  ]);

  return { collections, narrationAccess };
}

export type ReviewQueueSeed = {
  error?: string;
  caughtUp?: boolean;
  terms: ReviewTerm[];
};

function domainIdsForReview(domainId: string | undefined): string[] | "all" {
  return domainId && domainId !== "all" ? [domainId] : "all";
}

export async function getReviewFeedBatchAction(
  domainId: string,
  excludeTermIds: string[],
): Promise<ReviewQueueSeed> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error, terms: [] };

  try {
    const admin = createAdminClient();
    const scope = { domainIds: domainIdsForReview(domainId) };
    const cards = await pickReviewTermsForUser(
      admin,
      auth.user.id,
      scope,
      REVIEW_QUEUE_BUFFER_SIZE,
      excludeTermIds,
    );

    if (cards.length === 0) return { caughtUp: true, terms: [] };
    return { terms: cards.map(toReviewTerm) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load more terms. Try again.";
    return { error: message, terms: [] };
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

    return {};
  } catch (err) {
    console.error("rateReviewTermAction failed", { termId, grade, err });
    const message = err instanceof Error ? err.message : "Couldn't save your rating. Try again.";
    return { error: message };
  }
}
