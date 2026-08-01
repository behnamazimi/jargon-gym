/** Smart-queue term hydration — TermCard loading. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
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

function mapTermCardRow(row: {
  id: string;
  term: string;
  category: string;
  definition: string | null;
  example: string | null;
  discussion: string | null;
  controversy: string | null;
  domain_id: string;
  domain_name: string;
  relationships: Json;
}): TermCard {
  return {
    id: row.id,
    term: row.term,
    category: row.category,
    definition: row.definition ?? "",
    example: row.example,
    discussion: row.discussion,
    controversy: row.controversy,
    domainId: row.domain_id,
    domainName: row.domain_name,
    relationships: mapRelationshipsJson(row.relationships),
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
  return row ? mapTermCardRow(row) : null;
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
  const { data: domains, error: domainsError } = await client
    .from("domains")
    .select("id, name")
    .in("id", domainIds);

  if (domainsError) throw domainsError;

  const domainNameById = new Map(domains.map((d) => [d.id, d.name]));
  const mappedTerms = fullTerms.map(mapTerm);
  const relationshipRows = await fetchTermRelationshipsForTerms(
    client,
    mappedTerms.map((t) => t.id),
  );
  const termsWithRelationships = attachRelationshipsToTerms(mappedTerms, relationshipRows);

  const termOrderMap = new Map(termIds.map((id, idx) => [id, idx]));
  termsWithRelationships.sort(
    (a, b) => (termOrderMap.get(a.id) ?? 999) - (termOrderMap.get(b.id) ?? 999),
  );

  return termsWithRelationships.map((term) => {
    const domainId = fullTerms.find((t) => t.id === term.id)?.domain_id;
    return {
      id: term.id,
      term: term.term,
      category: term.category,
      definition: term.definition,
      example: term.example || null,
      discussion: term.discussion || null,
      controversy: term.controversy ?? null,
      domainId: domainId ?? "",
      domainName: domainId ? (domainNameById.get(domainId) ?? "Unknown") : "Unknown",
      relationships: term.relationships.map((rel) => ({
        direction: rel.direction,
        relationshipType: rel.relationshipType,
        relatedTermName: rel.relatedTermName,
        description: rel.description,
      })),
    };
  });
}

/** Admin hydrate via get_term_card RPC, preserving order. */
export async function hydrateTermCardsForUser(
  client: Client,
  userId: string,
  termIds: string[],
): Promise<TermCard[]> {
  const cards = await Promise.all(
    termIds.map(async (termId) => {
      const card = await fetchTermCardForUser(client, userId, termId);
      if (!card) {
        throw new Error(`Term card missing for ${termId}`);
      }
      return card;
    }),
  );
  return cards;
}
