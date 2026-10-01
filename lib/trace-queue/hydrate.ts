/** TRACE-queue term hydration — TermCard loading. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { parseLanguage, type DomainLanguage } from "@/lib/jargon/languages";
import { attachRelationshipsToTerms, mapTerm } from "@/lib/jargon/mappers";
import type { TermCard, TermCardRelationship } from "@/lib/jargon/term-card";
import { fetchTermRelationshipsForTerms } from "@/lib/jargon/terms";

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

async function fetchDomainLanguages(
  client: Client,
  domainIds: string[],
): Promise<Map<string, DomainLanguage>> {
  const { data, error } = await client
    .from("domains")
    .select("id, language")
    .in("id", [...new Set(domainIds)]);
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
    domain_id: string;
    domain_name: string;
    relationships: Json;
  },
  language: DomainLanguage,
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
    domainId: row.domain_id,
    domainName: row.domain_name,
    domainLanguage: language,
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
  const languages = await fetchDomainLanguages(client, [row.domain_id]);
  return mapTermCardRow(row, languages.get(row.domain_id) ?? "en");
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

  const domainIds = [...new Set(fullTerms.map((t) => t.domain_id))];
  const mappedTerms = fullTerms.map(mapTerm);

  const [domainsResult, relationshipRows] = await Promise.all([
    client.from("domains").select("id, name, language").in("id", domainIds),
    fetchTermRelationshipsForTerms(
      client,
      mappedTerms.map((t) => t.id),
    ),
  ]);

  const { data: domains, error: domainsError } = domainsResult;
  if (domainsError) throw domainsError;

  const domainById = new Map(domains.map((d) => [d.id, d]));
  const termsWithRelationships = attachRelationshipsToTerms(mappedTerms, relationshipRows);

  const termOrderMap = new Map(termIds.map((id, idx) => [id, idx]));
  termsWithRelationships.sort(
    (a, b) => (termOrderMap.get(a.id) ?? 999) - (termOrderMap.get(b.id) ?? 999),
  );

  return termsWithRelationships.map((term) => {
    const domainId = fullTerms.find((t) => t.id === term.id)?.domain_id;
    const domain = domainId ? domainById.get(domainId) : undefined;
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
      domainId: domainId ?? "",
      domainName: domain?.name ?? "Unknown",
      domainLanguage: parseLanguage(domain?.language),
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
    (data ?? []).map((row) => [row.id, mapTermCardRow(row, parseLanguage(row.domain_language))]),
  );
  return termIds.map((termId) => {
    const card = cardById.get(termId);
    if (!card) throw new Error(`Term card missing for ${termId}`);
    return card;
  });
}
