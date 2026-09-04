import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type AdminNarrationAllowlistRow = {
  userId: string;
  email: string;
  createdAt: string;
};

export async function listNarrationAllowlistForAdmin(
  client: Client,
): Promise<AdminNarrationAllowlistRow[]> {
  const { data: allowlist, error } = await client
    .from("narration_allowlist")
    .select("user_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!allowlist?.length) return [];

  const userIds = allowlist.map((row) => row.user_id);
  const { data: users, error: usersError } = await client
    .from("users")
    .select("id, email")
    .in("id", userIds);
  if (usersError) throw usersError;

  const emailById = new Map((users ?? []).map((user) => [user.id, user.email]));

  return allowlist.map((row) => ({
    userId: row.user_id,
    email: emailById.get(row.user_id) ?? "(unknown)",
    createdAt: row.created_at,
  }));
}
