import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type ReadMode = "unknown_only" | "stale_known";

export const READ_MODE_OPTIONS: { value: ReadMode; label: string }[] = [
  { value: "unknown_only", label: "Unknown terms only" },
  { value: "stale_known", label: "Fall back to known terms" },
];

/** Session-scoped read (RLS via `auth.uid()`, web). Direct table access
 *  works here because `authenticated` has a grant on user_settings and its
 *  own-row RLS policy — see getReadModeForUser for the service-role case. */
export async function getReadMode(client: Client, userId: string): Promise<ReadMode> {
  const { data, error } = await client
    .from("user_settings")
    .select("read_mode")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.read_mode as ReadMode | undefined) ?? "unknown_only";
}

/** Service-role read (widget). service_role has no direct grant on
 *  user_settings by design in this codebase, so this goes through the
 *  get_read_mode() SECURITY DEFINER RPC instead of a plain table select. */
export async function getReadModeForUser(client: Client, userId: string): Promise<ReadMode> {
  const { data, error } = await client.rpc("get_read_mode", { p_user_id: userId });
  if (error) throw error;
  return (data as ReadMode | null) ?? "unknown_only";
}

export async function saveReadMode(
  client: Client,
  userId: string,
  readMode: ReadMode,
): Promise<void> {
  const { error } = await client.from("user_settings").upsert(
    {
      user_id: userId,
      read_mode: readMode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}
