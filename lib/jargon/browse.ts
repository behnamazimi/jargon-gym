import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export async function fetchSharedDomainsBrowse(client: Client, userId: string) {
  const [sharedResult, collectionResult] = await Promise.all([
    client
      .from("domains")
      .select("id, name, icon_url, description, owner_id, terms(count)")
      .eq("visibility", "shared")
      .neq("owner_id", userId)
      .order("name"),
    client.from("user_collection_domains").select("domain_id").eq("user_id", userId),
  ]);

  if (sharedResult.error) throw sharedResult.error;
  if (collectionResult.error) throw collectionResult.error;

  const inCollection = new Set(collectionResult.data.map((row) => row.domain_id));

  return sharedResult.data.map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon_url ?? "",
    description: row.description ?? "",
    ownerId: row.owner_id,
    termCount: row.terms[0]?.count ?? 0,
    inCollection: inCollection.has(row.id),
  }));
}
