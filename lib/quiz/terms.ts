import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { parseKind, type CollectionKind } from "@/lib/terms/kinds";
import {
  countTermsForSelection as countStudyTermsForSelection,
  fetchQuizTermPool as fetchStudyQuizTermPool,
  type StudyAuthMode,
  type StudyCollection,
} from "@/lib/study";
import { toQuizTerm } from "./mappers";
import type { QuizTerm } from "./types";

type Client = SupabaseClient<Database>;

async function fetchCollectionKinds(
  client: Client,
  collectionIds: string[],
): Promise<Map<string, CollectionKind>> {
  if (collectionIds.length === 0) return new Map();

  const { data, error } = await client
    .from("collections")
    .select("id, kind")
    .in("id", collectionIds);
  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.id, parseKind(row.kind)]));
}

export async function fetchQuizTermPool(
  client: Client,
  userId: string,
  collectionIds: string[] | "all",
  questionCount: number,
  mode?: StudyAuthMode,
): Promise<QuizTerm[]> {
  const cards = await fetchStudyQuizTermPool(
    client,
    userId,
    { collectionIds },
    questionCount,
    mode,
  );
  const kinds = await fetchCollectionKinds(client, [
    ...new Set(cards.map((card) => card.collectionId)),
  ]);

  return cards.map((card) => toQuizTerm(card, kinds.get(card.collectionId) ?? "terms"));
}

export function countTermsForSelection(
  collections: StudyCollection[],
  collectionIds: string[] | "all",
): number {
  return countStudyTermsForSelection(collections, collectionIds);
}
