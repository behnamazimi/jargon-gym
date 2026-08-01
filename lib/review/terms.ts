import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ReviewTerm, ReviewTermStatus } from "./types";

type Client = SupabaseClient<Database>;

export const MAX_REVIEW_TERMS = 30;

export function getMaxReviewCardCount(availableTermCount: number): number {
  if (availableTermCount <= 0) return 0;
  return Math.min(availableTermCount, MAX_REVIEW_TERMS);
}

export async function fetchReviewTermPool(
  client: Client,
  userId: string,
  domainIds: string[] | "all",
  status: ReviewTermStatus,
  cardCount: number,
): Promise<ReviewTerm[]> {
  const { pickReviewTerms } = await import("@/lib/smart-queue/service");
  return pickReviewTerms(client, userId, { domainIds }, status, cardCount);
}
