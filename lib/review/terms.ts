import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchStudyTermPool, MAX_STUDY_TERMS } from "@/lib/study";
import { toReviewTerm } from "./mappers";
import type { ReviewTerm } from "./types";

type Client = SupabaseClient<Database>;

/** @deprecated Prefer MAX_STUDY_TERMS from @/lib/study */
export const MAX_REVIEW_TERMS = MAX_STUDY_TERMS;

export async function fetchReviewTermPool(
  client: Client,
  userId: string,
  domainIds: string[] | "all",
  cardCount: number,
): Promise<ReviewTerm[]> {
  const cards = await fetchStudyTermPool(client, userId, { domainIds }, cardCount);
  return cards.map(toReviewTerm);
}
