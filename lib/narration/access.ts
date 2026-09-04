import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/**
 * Whether narration is on for the app AND this user is on the allowlist.
 * Combined into a single RPC (public.has_narration_access) so every caller
 * makes one round trip and stays in sync with the DB-side source of truth.
 */
export async function getNarrationAccessForUser(client: Client, userId: string): Promise<boolean> {
  const { data } = await client.rpc("has_narration_access", { p_user_id: userId });
  return data ?? false;
}
