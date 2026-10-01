import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { parseLanguage, type DomainLanguage } from "@/lib/jargon/languages";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";

type Client = SupabaseClient<Database>;

export type ImportDestination = {
  id: string;
  name: string;
  language: DomainLanguage;
  termCount: number;
};

/** Collections the user owns (valid destinations) and the names of shared
 *  ones they only added, for the name guard. Light: no term text. */
export async function listImportDestinations(
  client: Client,
  userId: string,
): Promise<{ collections: ImportDestination[]; addedNames: string[] }> {
  const [owned, added] = await Promise.all([
    client
      .from("domains")
      .select("id, name, language, terms(count)")
      .eq("owner_id", userId)
      .order("name"),
    client.from("user_collection_domains").select("domains(name)").eq("user_id", userId),
  ]);

  if (owned.error) throw owned.error;
  if (added.error) throw added.error;

  return {
    collections: owned.data.map((row) => ({
      id: row.id,
      name: row.name,
      language: parseLanguage(row.language),
      termCount: row.terms[0]?.count ?? 0,
    })),
    addedNames: added.data.flatMap((row) => (row.domains ? [row.domains.name] : [])),
  };
}

export type DestinationMatch = { name: string; definition: string | null };

/** The destination's terms that match any of `names`, by the rule the unique
 *  index uses (trimmed, lowercased). Returns only the matches. */
export async function findDestinationMatches(
  client: Client,
  userId: string,
  domainId: string,
  names: string[],
): Promise<DestinationMatch[] | null> {
  const { data: domain, error } = await client
    .from("domains")
    .select("id")
    .eq("id", domainId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!domain) return null;

  const wanted = new Set(names.map((name) => name.trim().toLowerCase()));
  const rows = await fetchAllRows((from, to) =>
    client
      .from("terms")
      .select("term, definition")
      .eq("domain_id", domainId)
      .order("id")
      .range(from, to),
  );

  return rows
    .filter((row) => wanted.has(row.term.trim().toLowerCase()))
    .map((row) => ({ name: row.term, definition: row.definition }));
}

/** Every term name in a collection the caller owns, or null when it isn't theirs. */
export async function listCollectionTermNames(
  client: Client,
  userId: string,
  domainId: string,
): Promise<string[] | null> {
  const { data: domain, error } = await client
    .from("domains")
    .select("id")
    .eq("id", domainId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!domain) return null;

  const rows = await fetchAllRows((from, to) =>
    client.from("terms").select("term").eq("domain_id", domainId).order("id").range(from, to),
  );
  return rows.map((row) => row.term);
}
