/** TRACE-queue term hydration — TermCard loading. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { parseLanguage, type CollectionLanguage } from "@/lib/terms/languages";
import { attachRelationshipsToTerms, mapTerm } from "@/lib/terms/mappers";
import type { TermCard, TermCardRelationship } from "@/lib/terms/term-card";
import { fetchTermRelationshipsForTerms } from "@/lib/terms/terms";

type Client = SupabaseClient<Database>;

function mapRelationshipsJson(raw: Json): TermCardRelationship[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const direction = row.direction === "incoming" ? "incoming" : "outgoing";
    return [
      {
        direction,
        relationshipType: String(row.relationship_type ?? ""),
        relatedTermName: String(row.related_term_name ?? ""),
        description: String(row.description ?? ""),
      },
    ];
  });
}

async function fetchCollectionLanguages(
  client: Client,
  collectionIds: string[],
): Promise<Map<string, CollectionLanguage>> {
  const { data, error } = await client
    .from("collections")
    .select("id, language")
    .in("id", [...new Set(collectionIds)]);
  if (error) throw error;
  return new Map(data.map((d) => [d.id, parseLanguage(d.language)]));
}

function mapTermCardRow(
  row: {
    id: string;
    term: string;
    category: string;
    definition: string | null;
    example: string | null;
    mental_model: string | null;
    discussion: string | null;
    anti_example: string | null;
    controversy: string | null;
    note: string | null;
    collection_id: string;
    collection_name: string;
    relationships: Json;
  },
  language: CollectionLanguage,
): TermCard {
  return {
    id: row.id,
    term: row.term,
    category: row.category,
    definition: row.definition ?? "",
    example: row.example,
    mentalModel: row.mental_model,
    discussion: row.discussion,
    antiExample: row.anti_example,
    controversy: row.controversy,
    note: row.note,
    collectionId: row.collection_id,
    collectionName: row.collection_name,
    collectionLanguage: language,
    relationships: mapRelationshipsJson(row.relationships),
    isNewToUser: false,
  };
}

export async function fetchTermCardForUser(
  client: Client,
  userId: string,
  termId: string,
): Promise<TermCard | null> {
  const { data, error } = await client.rpc("get_term_card", {
    p_user_id: userId,
    p_term_id: termId,
  });

  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  const languages = await fetchCollectionLanguages(client, [row.collection_id]);
  return mapTermCardRow(row, languages.get(row.collection_id) ?? "en");
}

/** Session-client hydrate: full term join → TermCard[] in scored order. */
export async function hydrateTermsAsTermCards(
  client: Client,
  termIds: string[],
): Promise<TermCard[]> {
  if (termIds.length === 0) return [];

  const { data: fullTerms, error: fullTermsError } = await client
    .from("terms")
    .select("*")
    .in("id", termIds);

  if (fullTermsError) throw fullTermsError;
  if (fullTerms.length !== termIds.length) {
    throw new Error("Could not load all selected review terms.");
  }

  const collectionIds = [...new Set(fullTerms.map((t) => t.collection_id))];
  const mappedTerms = fullTerms.map(mapTerm);

  const [collectionsResult, relationshipRows] = await Promise.all([
    client.from("collections").select("id, name, language").in("id", collectionIds),
    fetchTermRelationshipsForTerms(
      client,
      mappedTerms.map((t) => t.id),
    ),
  ]);

  const { data: collections, error: collectionsError } = collectionsResult;
  if (collectionsError) throw collectionsError;

  const collectionById = new Map(collections.map((d) => [d.id, d]));
  const termsWithRelationships = attachRelationshipsToTerms(mappedTerms, relationshipRows);

  const termOrderMap = new Map(termIds.map((id, idx) => [id, idx]));
  termsWithRelationships.sort(
    (a, b) => (termOrderMap.get(a.id) ?? 999) - (termOrderMap.get(b.id) ?? 999),
  );

  return termsWithRelationships.map((term) => {
    const collectionId = fullTerms.find((t) => t.id === term.id)?.collection_id;
    const collection = collectionId ? collectionById.get(collectionId) : undefined;
    return {
      id: term.id,
      term: term.term,
      category: term.category,
      definition: term.definition,
      example: term.example || null,
      mentalModel: term.mentalModel || null,
      discussion: term.discussion || null,
      antiExample: term.antiExample || null,
      controversy: term.controversy ?? null,
      note: term.note ?? null,
      collectionId: collectionId ?? "",
      collectionName: collection?.name ?? "Unknown",
      collectionLanguage: parseLanguage(collection?.language),
      relationships: term.relationships.map((rel) => ({
        direction: rel.direction,
        relationshipType: rel.relationshipType,
        relatedTermName: rel.relatedTermName,
        description: rel.description,
      })),
      isNewToUser: false,
    };
  });
}

/** Admin hydrate via the batched get_term_cards RPC, preserving order. */
export async function hydrateTermCardsForUser(
  client: Client,
  userId: string,
  termIds: string[],
): Promise<TermCard[]> {
  if (termIds.length === 0) return [];

  const { data, error } = await client.rpc("get_term_cards", {
    p_user_id: userId,
    p_term_ids: termIds,
  });
  if (error) throw error;

  const cardById = new Map(
    (data ?? []).map((row) => [
      row.id,
      mapTermCardRow(row, parseLanguage(row.collection_language)),
    ]),
  );
  return termIds.map((termId) => {
    const card = cardById.get(termId);
    if (!card) throw new Error(`Term card missing for ${termId}`);
    return card;
  });
}
