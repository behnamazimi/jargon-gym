import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** Term ids the user set aside as "Not yet" in this collection. */
export async function fetchNotYetTermIds(client: Client, domainId: string): Promise<string[]> {
  const { data, error } = await client
    .from("triage_not_yet")
    .select("term_id, terms!inner(domain_id)")
    .eq("terms.domain_id", domainId);

  if (error) throw error;
  return data.map((row) => row.term_id);
}

export async function addNotYetTerms(client: Client, termIds: string[]) {
  const { error } = await client.rpc("my_add_not_yet_terms", { p_term_ids: termIds });
  if (error) throw error;
}

export async function removeNotYetTerm(client: Client, termId: string) {
  const { error } = await client.rpc("my_remove_not_yet_term", { p_term_id: termId });
  if (error) throw error;
}

export async function clearNotYetDomain(client: Client, domainId: string) {
  const { error } = await client.rpc("my_clear_not_yet_domain", { p_domain_id: domainId });
  if (error) throw error;
}
