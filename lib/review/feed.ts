import { requireAuthenticatedClient, getUserIsAdmin } from "@/lib/auth/require-session";
import { isUuid } from "@/lib/library/details";
import { isCollectionPreference } from "@/lib/study/collection-preference";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { listStudyCollectionState } from "@/lib/study/collections";
import { pickReviewTermsForUser } from "@/lib/trace-queue";
import { toReviewTerm } from "./mappers";
import { REVIEW_QUEUE_BUFFER_SIZE } from "./queue";
import type { ReviewQueueSeed } from "./types";

/** Everything the Review page needs besides the cards. */
export async function loadReviewSetup() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) {
    return { error: "Log in to review terms." as const };
  }

  const [{ active: collections, paused }, narrationAccess, canEvaluateTerms] = await Promise.all([
    listStudyCollectionState(auth.supabase, auth.user.id),
    getNarrationAccessForUser(createAdminClient(), auth.user.id),
    getUserIsAdmin(auth.user.id),
  ]);

  return { collections, paused, narrationAccess, canEvaluateTerms };
}

/** The next few cards TRACE ranks for the signed-in user, skipping the ones
 *  already on screen. Used for the first load and every refill. */
export async function loadReviewFeed(
  domainId: string,
  excludeTermIds: string[],
): Promise<ReviewQueueSeed> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error, terms: [] };

  try {
    const scope = { domainIds: domainId === "all" ? ("all" as const) : [domainId] };
    const cards = await pickReviewTermsForUser(
      createAdminClient(),
      auth.user.id,
      scope,
      REVIEW_QUEUE_BUFFER_SIZE,
      excludeTermIds,
    );

    if (cards.length === 0) return { caughtUp: true, terms: [] };
    return { terms: cards.map(toReviewTerm) };
  } catch (err) {
    console.error("Review queue failed:", err);
    return { error: "Couldn't load more terms. Try again.", terms: [] };
  }
}

/** Only bounds the request size; a real session never gets near it. */
const MAX_EXCLUDED_TERMS = 20_000;

/** A refill request body: `{ domainId: "all" | uuid, excludeTermIds: uuid[] }`. */
export function parseReviewFeedRequest(
  body: unknown,
): { domainId: string; excludeTermIds: string[] } | null {
  if (!body || typeof body !== "object") return null;
  const { domainId, excludeTermIds } = body as Record<string, unknown>;
  if (!isCollectionPreference(domainId)) return null;
  if (!Array.isArray(excludeTermIds) || excludeTermIds.length > MAX_EXCLUDED_TERMS) return null;
  if (!excludeTermIds.every((id) => typeof id === "string" && isUuid(id))) return null;
  return { domainId, excludeTermIds };
}
