import type { SupabaseClient } from "@supabase/supabase-js";
import { containsPattern } from "@/lib/admin/email-lookup";
import { clampPage, PAGE_SIZE, type WaitlistFilter } from "@/lib/admin/list-params";
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

type WaitlistQuery = { status: WaitlistFilter; q: string; page: number };

/** One page of waitlist requests, newest first. `signed_up` is derived (the invite's code
 *  was used), so it is a badge here, not a filter. */
export async function listWaitlist(
  client: Client,
  { status, q, page }: WaitlistQuery,
): Promise<{ rows: AdminWaitlistRow[]; total: number; page: number }> {
  let count = client.from("waitlist_requests").select("id", { count: "exact", head: true });
  if (status !== "all") count = count.eq("status", status);
  if (q) count = count.ilike("email", containsPattern(q));
  const { count: total, error: countError } = await count;
  if (countError) throw countError;

  // A page past the end is an error from the database, so clamp it first.
  const current = clampPage(page, total ?? 0);
  const from = (current - 1) * PAGE_SIZE;

  let rows = client
    .from("waitlist_requests")
    .select("id, email, status, created_at, invited_at, referral_codes(used_by)");
  if (status !== "all") rows = rows.eq("status", status);
  if (q) rows = rows.ilike("email", containsPattern(q));
  const { data, error } = await rows
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  return {
    total: total ?? 0,
    page: current,
    rows: (data ?? []).map((row) => {
      const base = row.status as "pending" | "invited";
      return {
        id: row.id,
        email: row.email,
        status: base === "invited" && row.referral_codes?.used_by ? "signed_up" : base,
        createdAt: row.created_at,
        invitedAt: row.invited_at,
      };
    }),
  };
}
