import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import type { PickMeta } from "@/lib/smart-queue";
import type { StudyAuthMode, StudyScope } from "./types";

type Client = SupabaseClient<Database>;

type StudyTermPoolResult = {
  cards: TermCard[];
  pickMeta: PickMeta[];
};

/** Review's pool fetch: blends known + unknown internally, sampled
 *  uniformly — no status to pass, Review no longer has a pure pool mode. */
export async function fetchStudyTermPool(
  client: Client,
  userId: string,
  scope: StudyScope,
  limit: number,
  mode: StudyAuthMode = "session",
): Promise<StudyTermPoolResult> {
  if (mode === "admin") {
    const { pickMixedReviewTermsForUser } = await import("@/lib/smart-queue");
    return pickMixedReviewTermsForUser(client, userId, scope, limit);
  }

  const { pickMixedReviewTerms } = await import("@/lib/smart-queue");
  return pickMixedReviewTerms(client, userId, scope, limit);
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
