import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { type TermInput, termInputToRow, termInputToUpdateRow } from "@/lib/jargon/term-schema";

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

export async function fetchTermRelationshipsForTerms(client: Client, termIds: string[]) {
  if (termIds.length === 0) return [];

  const { data, error } = await client
    .from("term_relationships")
    .select("id, relationship_type, description, source_term_id, target_term_id")
    .in("source_term_id", termIds)
    .in("target_term_id", termIds);

  if (error) throw error;
  return data;
}
