import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type NarrationAccess = "on" | "off" | "partly";

export type AdminPerson = {
  id: string;
  email: string;
  role: "admin" | "member";
  createdAt: string;
  /** Null when the balance couldn't be read. */
  credits: { remaining: number; total: number } | null;
  narration: NarrationAccess;
};

/** On only when both narration features are allowed. One of two is a state the
 *  page can't produce, so it is shown as it is. */
export function narrationAccess(featuresAllowed: number): NarrationAccess {
  if (featuresAllowed >= 2) return "on";
  return featuresAllowed === 1 ? "partly" : "off";
}

/** One person for the members panel. Their balance is only readable with the server's own
 *  client, so `service` must only be used after the admin check. */
export async function getPerson(
  client: Client,
  service: Client,
  userId: string,
): Promise<AdminPerson | null> {
  const { data: user, error } = await client
    .from("users")
    .select("id, email, role, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!user) return null;

  const { data: allowed, error: allowError } = await client
    .from("ai_feature_allowlist")
    .select("feature")
    .eq("user_id", userId)
    .in("feature", ["narration_term", "narration_story"]);
  if (allowError) throw allowError;

  const { data: balance, error: balanceError } = await service.rpc("ai_credit_balance", {
    p_user_id: userId,
  });
  if (balanceError) console.error("Couldn't read an AI credit balance:", balanceError);
  const row = balanceError ? undefined : balance?.[0];

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
    credits: row ? { remaining: row.remaining, total: row.total } : null,
    narration: narrationAccess(allowed?.length ?? 0),
  };
}
