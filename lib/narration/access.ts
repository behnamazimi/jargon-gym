import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type NarrationFeature = "narration_term" | "narration_story";

/**
 * Whether the feature is on for the app AND this user may use it (an allowlist
 * row, or the feature is open to everyone). One RPC (public.has_feature_access),
 * so every caller stays in sync with the database. Pass the admin client: the
 * function is callable by the server role only.
 */
export async function getNarrationAccessForUser(
  client: Client,
  userId: string,
  feature: NarrationFeature = "narration_term",
): Promise<boolean> {
  const { data, error } = await client.rpc("has_feature_access", {
    p_user_id: userId,
    p_feature: feature,
  });
  if (error) console.error("Couldn't check narration access:", error);
  return data ?? false;
}

/** Admins can play clips from the admin pages without being on the allowlist. */
export async function isAdminAccount(client: Client, userId: string): Promise<boolean> {
  const { data } = await client.from("users").select("role").eq("id", userId).maybeSingle();
  return data?.role === "admin";
}
