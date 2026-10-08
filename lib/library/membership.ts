import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type CollectionMembership = "owned" | "added" | "available";

/** Whether a collection is already in someone's library, theirs, or free to add. */
export async function getCollectionMembership(
  client: SupabaseClient<Database>,
  userId: string,
  collectionId: string,
): Promise<CollectionMembership> {
  const { data: collection, error: collectionError } = await client
    .from("collections")
    .select("owner_id")
    .eq("id", collectionId)
    .maybeSingle();
  if (collectionError) throw collectionError;
  if (collection?.owner_id === userId) return "owned";

  const { count, error } = await client
    .from("user_collections")
    .select("collection_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("collection_id", collectionId);
  if (error) throw error;
  return count ? "added" : "available";
}
