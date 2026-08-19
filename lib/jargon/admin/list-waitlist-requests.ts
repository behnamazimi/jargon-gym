import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type AdminWaitlistStatus = "pending" | "invited" | "signed_up";

export type AdminWaitlistRow = {
  id: string;
  email: string;
  status: AdminWaitlistStatus;
  createdAt: string;
  invitedAt: string | null;
};

export async function listWaitlistRequestsForAdmin(client: Client): Promise<AdminWaitlistRow[]> {
  const { data, error } = await client
    .from("waitlist_requests")
    .select("id, email, status, created_at, invited_at, referral_codes(used_by)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data?.length) return [];

  return data.map((row) => {
    const baseStatus = row.status as "pending" | "invited";
    const status: AdminWaitlistStatus =
      baseStatus === "invited" && row.referral_codes?.used_by ? "signed_up" : baseStatus;

    return {
      id: row.id,
      email: row.email,
      status,
      createdAt: row.created_at,
      invitedAt: row.invited_at,
    };
  });
}
