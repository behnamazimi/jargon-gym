import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  countTermsForSelection as countStudyTermsForSelection,
  fetchQuizTermPool as fetchStudyQuizTermPool,
  listStudyCollections,
  MAX_STUDY_TERMS,
} from "@/lib/study";
import { toQuizTerm } from "./mappers";
import type { QuizableCollection, QuizTerm } from "./types";

type Client = SupabaseClient<Database>;

/** @deprecated Prefer MAX_STUDY_TERMS from @/lib/study */
export const MAX_QUIZ_TERMS = MAX_STUDY_TERMS;

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
  questionCount: number,
): Promise<QuizTerm[]> {
  const { cards, pickMeta } = await fetchStudyQuizTermPool(
    client,
    userId,
    { domainIds },
    questionCount,
  );

  const metaById = new Map(pickMeta.map((m) => [m.termId, m]));
  return cards.map((card) => {
    const meta = metaById.get(card.id);
    return toQuizTerm(card, meta?.reasons, meta?.strength);
  });
}

export function countTermsForSelection(
  collections: QuizableCollection[],
  domainIds: string[] | "all",
): number {
  return countStudyTermsForSelection(collections, domainIds, "known");
}
