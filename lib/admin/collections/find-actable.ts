import type { SupabaseClient } from "@supabase/supabase-js";
import { AdminError } from "@/lib/admin/admin-error";
import type { Database } from "@/lib/supabase/database.types";
import { listAllCollectionsForAdmin } from "./list-all-collections";

/** The collection, if an admin may change it. The browser only sends an id, and the
 *  publish function bypasses row level security, so ownership is checked here. */
export async function findActable(
  supabase: SupabaseClient<Database>,
  adminId: string,
  domainId: string,
) {
  const collections = await listAllCollectionsForAdmin(supabase, adminId);
  const collection = collections.find((row) => row.id === domainId);
  if (!collection || collection.readOnly) throw new AdminError("Collection not found.");
  return { collection, collections };
}
