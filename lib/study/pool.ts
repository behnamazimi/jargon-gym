import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import type { StudyAuthMode, StudyScope } from "./types";

type Client = SupabaseClient<Database>;

/** Review's pool fetch: ranked by R_r(t) ascending — most at risk of
 *  forgetting first. Terms with no Review history yet rank first (§4b) so
 *  they can receive their first grade — Review no longer blends a
 *  separate unknown pool. */
export async function fetchStudyTermPool(
  client: Client,
  userId: string,
  scope: StudyScope,
  limit: number,
  mode: StudyAuthMode = "session",
): Promise<TermCard[]> {
  if (mode === "admin") {
    const { pickReviewTermsForUser } = await import("@/lib/trace-queue");
    return pickReviewTermsForUser(client, userId, scope, limit);
  }

  const { pickReviewTerms } = await import("@/lib/trace-queue");
  return pickReviewTerms(client, userId, scope, limit);
}

/** Quiz's dedicated pool fetch: ranked by R_g(t) ascending. Terms with no
 *  Quiz history yet rank first (§5) so they can receive their first answer. */
export async function fetchQuizTermPool(
  client: Client,
  userId: string,
  scope: StudyScope,
  limit: number,
  mode: StudyAuthMode = "session",
): Promise<TermCard[]> {
  if (mode === "admin") {
    const { pickQuizTermsForUser } = await import("@/lib/trace-queue");
    return pickQuizTermsForUser(client, userId, scope, limit);
  }

  const { pickQuizTerms } = await import("@/lib/trace-queue");
  return pickQuizTerms(client, userId, scope, limit);
}
