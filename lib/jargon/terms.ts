import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { type TermInput, termInputToRow, termInputToUpdateRow } from "@/lib/jargon/term-schema";
import type { TermRelationshipLink } from "@/lib/jargon/types";

type Client = SupabaseClient<Database>;

export class TermMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TermMutationError";
  }
}

function isUniqueViolation(error: { code?: string }) {
  return error.code === "23505";
}

export async function createTerm(
  client: Client,
  domainId: string,
  _ownerId: string,
  input: TermInput,
) {
  const row = termInputToRow(input, domainId);

  const { data, error } = await client.from("terms").insert(row).select("id").single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new TermMutationError(
        `A term named "${input.term.trim()}" already exists in this collection.`,
      );
    }
    throw error;
  }

  return data;
}

export async function updateTerm(client: Client, termId: string, input: TermInput) {
  const row = termInputToUpdateRow(input);

  const { error } = await client.from("terms").update(row).eq("id", termId);

  if (error) {
    if (isUniqueViolation(error)) {
      throw new TermMutationError(
        `A term named "${input.term.trim()}" already exists in this collection.`,
      );
    }
    throw error;
  }
}

export async function deleteTerm(client: Client, termId: string) {
  const { error } = await client.from("terms").delete().eq("id", termId);
  if (error) throw error;
}

export async function fetchTermsByDomain(client: Client, domainId: string) {
  const { data, error } = await client
    .from("terms")
    .select("*")
    .eq("domain_id", domainId)
    .order("category")
    .order("term");

  if (error) throw error;
  return data;
}

/**
 * Relationships touching any of `termIds` (source OR target).
 * Joins both term names so single-term hydrate (read/review) still resolves
 * related terms that aren't in the hydrated set.
 */
export async function fetchTermRelationshipsForTerms(
  client: Client,
  termIds: string[],
): Promise<TermRelationshipLink[]> {
  if (termIds.length === 0) return [];

  const { data, error } = await client
    .from("term_relationships")
    .select(
      `
      id,
      relationship_type,
      description,
      source_term_id,
      target_term_id,
      source:terms!term_relationships_source_term_id_fkey(term),
      target:terms!term_relationships_target_term_id_fkey(term)
    `,
    )
    .or(`source_term_id.in.(${termIds.join(",")}),target_term_id.in.(${termIds.join(",")})`);

  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const source = row.source as unknown as { term: string } | null;
    const target = row.target as unknown as { term: string } | null;
    if (!source?.term || !target?.term) return [];

    return [
      {
        id: row.id,
        relationship_type: row.relationship_type,
        description: row.description,
        source_term_id: row.source_term_id,
        target_term_id: row.target_term_id,
        source_term_name: source.term,
        target_term_name: target.term,
      },
    ];
  });
}

/**
 * All relationships touching domain `domainId` — source OR target term
 * belongs to it. Domain-scoped RPC, not a term-id list, so it doesn't hit
 * PostgREST's URL length limit for large domains. Only equivalent to
 * fetchTermRelationshipsForTerms(client, everyTermIdInDomain) because
 * term_relationships rows are always single-domain (RLS-enforced on every
 * insert/update, see 20260725140000_user_owned_domains.sql) — do not reuse
 * this for a caller that needs cross-domain relationship lookups.
 */
export async function fetchTermRelationshipsForDomain(
  client: Client,
  domainId: string,
): Promise<TermRelationshipLink[]> {
  const { data, error } = await client.rpc("my_term_relationships_by_domain", {
    p_domain_id: domainId,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    relationship_type: row.relationship_type,
    description: row.description,
    source_term_id: row.source_term_id,
    target_term_id: row.target_term_id,
    source_term_name: row.source_term_name,
    target_term_name: row.target_term_name,
  }));
}
