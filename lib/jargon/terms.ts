import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

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

export async function fetchDomainIdForTerm(client: Client, termId: string) {
  const { data, error } = await client
    .from("terms")
    .select("domain_id")
    .eq("id", termId)
    .maybeSingle();

  if (error) throw error;
  return data?.domain_id ?? null;
}
