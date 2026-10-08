import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { type ParsedTerm, termInputToRow, termInputToUpdateRow } from "@/lib/terms/term-schema";
import type { TermRelationshipLink } from "@/lib/terms/types";

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
  collectionId: string,
  _ownerId: string,
  input: ParsedTerm,
) {
  const row = termInputToRow(input, collectionId);

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

export async function updateTerm(client: Client, termId: string, input: ParsedTerm) {
  const row = termInputToUpdateRow(input);

  const { error } = await client.from("terms").update(row).eq("id", termId);

  if (error) {
    if (isUniqueViolation(error)) {
      throw new TermMutationError(
        `A term named "${input.term.trim()}" already exists in this collection.`,
      );
    }
    if (error.code === "23514") {
      throw new TermMutationError(
        "A term needs a definition once it has one. Change the text instead.",
      );
    }
    throw error;
  }
}

/** Gives an unfinished term its definition. Resolves false when the term was
 *  already finished or removed, so a second tab can't overwrite the first. */
export async function finishTerm(
  client: Client,
  termId: string,
  input: { definition: string; category?: string | null },
): Promise<boolean> {
  const category = input.category?.trim();
  const { data, error } = await client
    .from("terms")
    .update({ definition: input.definition.trim(), ...(category ? { category } : {}) })
    .eq("id", termId)
    .is("definition", null)
    .select("id");

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function deleteTerm(client: Client, termId: string) {
  const { error } = await client.from("terms").delete().eq("id", termId);
  if (error) throw error;
}

export async function fetchTermsByCollection(client: Client, collectionId: string) {
  return fetchAllRows((from, to) =>
    client
      .from("terms")
      .select("*")
      .eq("collection_id", collectionId)
      .order("created_at")
      .order("term")
      .order("id")
      .range(from, to),
  );
}

/** Only what the Library list needs per term; see LibraryTerm. */
export async function fetchTermIndexByCollection(client: Client, collectionId: string) {
  return fetchAllRows((from, to) =>
    client
      .from("terms")
      .select("id, term, category, definition")
      .eq("collection_id", collectionId)
      .order("created_at")
      .order("term")
      .order("id")
      .range(from, to),
  );
}

/** Full rows for the given terms. RLS limits them to what the caller can see. */
export async function fetchTermsByIds(client: Client, termIds: string[]) {
  if (termIds.length === 0) return [];
  const { data, error } = await client.from("terms").select("*").in("id", termIds);
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
 * All relationships touching collection `collectionId` — source OR target term
 * belongs to it. Collection-scoped RPC, not a term-id list, so it doesn't hit
 * PostgREST's URL length limit for large collections. Only equivalent to
 * fetchTermRelationshipsForTerms(client, everyTermIdInCollection) because
 * term_relationships rows are always single-collection (RLS-enforced on every
 * insert/update, see 20260725140000_user_owned_collections.sql) — do not reuse
 * this for a caller that needs cross-collection relationship lookups.
 */
export async function fetchTermRelationshipsForCollection(
  client: Client,
  collectionId: string,
): Promise<TermRelationshipLink[]> {
  const data = await fetchAllRows((from, to) =>
    client
      .rpc("my_term_relationships_by_collection", { p_collection_id: collectionId })
      .order("id")
      .range(from, to),
  );

  return data.map((row) => ({
    id: row.id,
    relationship_type: row.relationship_type,
    description: row.description,
    source_term_id: row.source_term_id,
    target_term_id: row.target_term_id,
    source_term_name: row.source_term_name,
    target_term_name: row.target_term_name,
  }));
}
