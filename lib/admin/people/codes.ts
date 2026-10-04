import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type SharedCodeStatus = "active" | "paused" | "full" | "expired";

export type AdminSharedCode = {
  id: string;
  code: string;
  label: string;
  maxUses: number;
  useCount: number;
  expiresAt: string | null;
  status: SharedCodeStatus;
};

const STATUSES: readonly SharedCodeStatus[] = ["active", "paused", "full", "expired"];

function toStatus(value: string): SharedCodeStatus {
  return STATUSES.find((status) => status === value) ?? "paused";
}

/** Every shared code, newest first, with how many seats are taken. */
export async function listSharedCodes(client: Client): Promise<AdminSharedCode[]> {
  const { data, error } = await client.rpc("admin_list_shared_referral_codes");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label ?? "",
    maxUses: row.max_uses,
    useCount: row.use_count,
    expiresAt: row.expires_at,
    status: toStatus(row.status),
  }));
}
