import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** Term ids the user set aside as "Not yet" in this collection. */
export async function fetchNotYetTermIds(client: Client, collectionId: string): Promise<string[]> {
  const { data, error } = await client
    .from("triage_not_yet")
    .select("term_id, terms!inner(collection_id)")
    .eq("terms.collection_id", collectionId);

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

export async function clearNotYetCollection(client: Client, collectionId: string) {
  const { error } = await client.rpc("my_clear_not_yet_collection", {
    p_collection_id: collectionId,
  });
  if (error) throw error;
}
