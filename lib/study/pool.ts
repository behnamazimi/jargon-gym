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
