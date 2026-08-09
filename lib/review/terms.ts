import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchStudyTermPool, getMaxStudyCount, MAX_STUDY_TERMS } from "@/lib/study";
import { toReviewTerm } from "./mappers";
import type { ReviewTerm, ReviewTermStatus } from "./types";

type Client = SupabaseClient<Database>;

/** @deprecated Prefer MAX_STUDY_TERMS from @/lib/study */
export const MAX_REVIEW_TERMS = MAX_STUDY_TERMS;

export function getMaxReviewCardCount(availableTermCount: number): number {
  return getMaxStudyCount(availableTermCount);
}

export async function fetchReviewTermPool(
  client: Client,
  userId: string,
  domainIds: string[] | "all",
  status: ReviewTermStatus,
  cardCount: number,
): Promise<ReviewTerm[]> {
  const { cards, pickMeta } = await fetchStudyTermPool(
    client,
    userId,
    { domainIds },
    status,
    cardCount,
    "session",
    "review",
  );

  const reasonsById = new Map(pickMeta.map((m) => [m.termId, m.reasons]));
  return cards.map((card) => toReviewTerm(card, reasonsById.get(card.id)));
}
