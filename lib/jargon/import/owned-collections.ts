import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type OwnedCollectionForImport = {
  id: string;
  name: string;
  terms: string[];
};

export async function listOwnedCollectionsForImport(
  client: Client,
  userId: string,
): Promise<OwnedCollectionForImport[]> {
  const { data: domains, error } = await client
    .from("domains")
    .select("id, name")
    .eq("owner_id", userId)
    .order("name");

  if (error) throw error;
  if (!domains?.length) return [];

  const { data: terms, error: termsError } = await client
    .from("terms")
    .select("term, domain_id")
    .in(
      "domain_id",
      domains.map((domain) => domain.id),
    )
    .order("term");

  if (termsError) throw termsError;

  const termsByDomain = new Map<string, string[]>();
  for (const row of terms ?? []) {
    const list = termsByDomain.get(row.domain_id) ?? [];
    list.push(row.term);
    termsByDomain.set(row.domain_id, list);
  }

  return domains.map((domain) => ({
    id: domain.id,
    name: domain.name,
    terms: termsByDomain.get(domain.id) ?? [],
  }));
}
