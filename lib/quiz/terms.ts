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

async function fetchDomainKinds(
  client: Client,
  domainIds: string[],
): Promise<Map<string, CollectionKind>> {
  if (domainIds.length === 0) return new Map();

  const { data, error } = await client.from("domains").select("id, kind").in("id", domainIds);
  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.id, parseKind(row.kind)]));
}

export async function fetchQuizTermPool(
  client: Client,
  userId: string,
  domainIds: string[] | "all",
  questionCount: number,
  mode?: StudyAuthMode,
): Promise<QuizTerm[]> {
  const cards = await fetchStudyQuizTermPool(client, userId, { domainIds }, questionCount, mode);
  const kinds = await fetchDomainKinds(client, [...new Set(cards.map((card) => card.domainId))]);

  return cards.map((card) => toQuizTerm(card, kinds.get(card.domainId) ?? "terms"));
}

export function countTermsForSelection(
  collections: StudyCollection[],
  domainIds: string[] | "all",
): number {
  return countStudyTermsForSelection(collections, domainIds);
}
