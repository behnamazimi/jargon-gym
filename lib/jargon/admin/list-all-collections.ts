import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type AdminCollectionRow = {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string | null;
  termCount: number;
  isBuiltin: boolean;
  isPublic: boolean;
  slug: string | null;
  visibility: "private" | "shared";
  /** Someone else's private collection: an admin can see it exists, not change it. */
  readOnly: boolean;
};

/** Admins act on shared collections and their own. Other people's private ones are theirs alone. */
export function canActOnCollection(
  collection: { visibility: string; ownerId: string },
  adminId: string,
): boolean {
  return collection.visibility === "shared" || collection.ownerId === adminId;
}

/** Every collection, including other people's private ones: the table's row
 *  level security hides those from an admin's own session, so this reads
 *  through a function. */
export async function listAllCollectionsForAdmin(
  client: Client,
  adminId: string,
): Promise<AdminCollectionRow[]> {
  const { data, error } = await client.rpc("admin_list_collections");
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    // The generated types treat these two as never null; the join and the column can be.
    ownerEmail: (row.owner_email as string | null) ?? null,
    termCount: Number(row.term_count),
    isBuiltin: row.is_builtin,
    isPublic: row.is_public,
    slug: (row.slug as string | null) || null,
    visibility: row.visibility,
    readOnly: !canActOnCollection({ visibility: row.visibility, ownerId: row.owner_id }, adminId),
  }));
}
