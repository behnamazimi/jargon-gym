import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchStudyTermPool, getMaxStudyCount, MAX_STUDY_TERMS } from "@/lib/study";
import { toReviewTerm } from "./mappers";
import type { ReviewTerm } from "./types";

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
  cardCount: number,
): Promise<ReviewTerm[]> {
  const { cards, pickMeta } = await fetchStudyTermPool(
    client,
    userId,
    { domainIds },
    cardCount,
    "session",
    "review",
  );

  const metaById = new Map(pickMeta.map((m) => [m.termId, m]));
  return cards.map((card) => {
    const meta = metaById.get(card.id);
    return toReviewTerm(
      card,
      meta?.originStatus ?? "unknown",
      meta?.reasons,
      undefined,
      meta?.strength,
    );
  });
}
