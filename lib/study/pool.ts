import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TermCard } from "@/lib/jargon/term-card";
import type { StudyAuthMode, StudyScope, TermPoolStatus } from "./types";

type Client = SupabaseClient<Database>;

export async function fetchStudyTermPool(
  client: Client,
  userId: string,
  scope: StudyScope,
  status: TermPoolStatus,
  limit: number,
  mode: StudyAuthMode = "session",
): Promise<TermCard[]> {
  if (mode === "admin") {
    const { pickReviewTermsForUser } = await import("@/lib/smart-queue");
    return pickReviewTermsForUser(client, userId, scope, status, limit);
  }

  const { pickReviewTerms } = await import("@/lib/smart-queue");
  return pickReviewTerms(client, userId, scope, status, limit);
}
