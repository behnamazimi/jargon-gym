import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import type { PickContext, PickMeta } from "@/lib/smart-queue";
import type { StudyAuthMode, StudyScope, TermPoolStatus } from "./types";

type Client = SupabaseClient<Database>;

type StudyTermPoolResult = {
  cards: TermCard[];
  pickMeta: PickMeta[];
};

export async function fetchStudyTermPool(
  client: Client,
  userId: string,
  scope: StudyScope,
  status: TermPoolStatus,
  limit: number,
  mode: StudyAuthMode = "session",
  context: PickContext = "read",
): Promise<StudyTermPoolResult> {
  if (mode === "admin") {
    const { pickReviewTermsForUser } = await import("@/lib/smart-queue");
    return pickReviewTermsForUser(client, userId, scope, status, limit, context);
  }

  const { pickReviewTerms } = await import("@/lib/smart-queue");
  return pickReviewTerms(client, userId, scope, status, limit, context);
}

/** Quiz's dedicated pool fetch: known pool only, hard-tier picking. No
 *  status param — Quiz is never a way to learn unknown terms. */
export async function fetchQuizTermPool(
  client: Client,
  userId: string,
  scope: StudyScope,
  limit: number,
  mode: StudyAuthMode = "session",
): Promise<StudyTermPoolResult> {
  if (mode === "admin") {
    const { pickQuizTermCardsForUser } = await import("@/lib/smart-queue");
    return pickQuizTermCardsForUser(client, userId, scope, limit);
  }

  const { pickQuizTermCards } = await import("@/lib/smart-queue");
  return pickQuizTermCards(client, userId, scope, limit);
}
