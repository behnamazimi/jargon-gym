import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { attachRelationshipsToTerms, mapTerm, mapTermsByState } from "@/lib/jargon/mappers";
import {
  fetchTermRelationshipsForDomain,
  fetchTermRelationshipsForTerms,
  fetchTermsByDomain,
  fetchTermsByIds,
} from "@/lib/jargon/terms";
import type { Term } from "@/lib/jargon/types";

type Client = SupabaseClient<Database>;

/** Upper bound on one details request, so its relationship filter stays well
 *  under PostgREST's URL length limit. */
const MAX_DETAIL_IDS = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The term ids in a comma-separated query value, or null when any is invalid. */
export function parseDetailIds(raw: string | null): string[] | null {
  if (!raw) return null;
  const ids = [...new Set(raw.split(","))];
  if (ids.length > MAX_DETAIL_IDS || !ids.every((id) => UUID.test(id))) return null;
  return ids;
}

/** Full terms, with their relationships, for the given ids. */
export async function fetchTermDetails(client: Client, termIds: string[]): Promise<Term[]> {
  const [rows, relationships] = await Promise.all([
    fetchTermsByIds(client, termIds),
    fetchTermRelationshipsForTerms(client, termIds),
  ]);
  return attachRelationshipsToTerms(rows.map(mapTerm), relationships);
}

/** Every finished term of a collection in full, for export. */
export async function fetchCollectionForExport(client: Client, domainId: string): Promise<Term[]> {
  const [rows, relationships] = await Promise.all([
    fetchTermsByDomain(client, domainId),
    fetchTermRelationshipsForDomain(client, domainId),
  ]);
  return attachRelationshipsToTerms(mapTermsByState(rows).terms, relationships);
}

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
