import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  countTermsForSelection as countStudyTermsForSelection,
  fetchQuizTermPool as fetchStudyQuizTermPool,
  type StudyCollection,
} from "@/lib/study";
import { toQuizTerm } from "./mappers";
import type { QuizTerm } from "./types";

type Client = SupabaseClient<Database>;

export async function fetchQuizTermPool(
  client: Client,
  userId: string,
  domainIds: string[] | "all",
  questionCount: number,
): Promise<QuizTerm[]> {
  const cards = await fetchStudyQuizTermPool(client, userId, { domainIds }, questionCount);

  return cards.map(toQuizTerm);
}

export function countTermsForSelection(
  collections: StudyCollection[],
  domainIds: string[] | "all",
): number {
  return countStudyTermsForSelection(collections, domainIds);
}
