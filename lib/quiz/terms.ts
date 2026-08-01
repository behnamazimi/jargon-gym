import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  countTermsForSelection as countStudyTermsForSelection,
  fetchStudyTermPool,
  getMaxStudyCount,
  listStudyCollections,
  MAX_STUDY_TERMS,
} from "@/lib/study";
import { toQuizTerm } from "./mappers";
import type { QuizableCollection, QuizTerm, QuizTermStatus } from "./types";

type Client = SupabaseClient<Database>;

/** @deprecated Prefer MAX_STUDY_TERMS from @/lib/study */
export const MAX_QUIZ_TERMS = MAX_STUDY_TERMS;

export function getMaxQuizQuestionCount(availableTermCount: number): number {
  return getMaxStudyCount(availableTermCount);
}

export async function listQuizableCollections(
  client: Client,
  userId: string,
): Promise<QuizableCollection[]> {
  return listStudyCollections(client, userId);
}

export async function fetchQuizTermPool(
  client: Client,
  userId: string,
  domainIds: string[] | "all",
  status: QuizTermStatus,
  questionCount: number,
): Promise<QuizTerm[]> {
  const cards = await fetchStudyTermPool(
    client,
    userId,
    { domainIds },
    status,
    questionCount,
    "session",
  );
  return cards.map(toQuizTerm);
}

export function countTermsForSelection(
  collections: QuizableCollection[],
  domainIds: string[] | "all",
  status: QuizTermStatus,
): number {
  return countStudyTermsForSelection(collections, domainIds, status);
}
