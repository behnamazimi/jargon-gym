import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type CollectionMembership = "owned" | "added" | "available";

/** Whether a collection is already in someone's library, theirs, or free to add. */
export async function getCollectionMembership(
  client: SupabaseClient<Database>,
  userId: string,
  domainId: string,
): Promise<CollectionMembership> {
  const { data: domain, error: domainError } = await client
    .from("domains")
    .select("owner_id")
    .eq("id", domainId)
    .maybeSingle();
  if (domainError) throw domainError;
  if (domain?.owner_id === userId) return "owned";

  const { count, error } = await client
    .from("user_collection_domains")
    .select("domain_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("domain_id", domainId);
  if (error) throw error;
  return count ? "added" : "available";
}
