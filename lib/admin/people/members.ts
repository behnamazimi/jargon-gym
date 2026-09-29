import type { SupabaseClient } from "@supabase/supabase-js";
import { containsPattern } from "@/lib/admin/email-lookup";
import { clampPage, PAGE_SIZE } from "@/lib/admin/list-params";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type AdminMemberRow = {
  id: string;
  email: string;
  role: "admin" | "member";
  createdAt: string;
};

/** One page of accounts, newest first. Admins can read every account row. */
export async function listMembers(
  client: Client,
  { q, page }: { q: string; page: number },
): Promise<{ rows: AdminMemberRow[]; total: number; page: number }> {
  let count = client.from("users").select("id", { count: "exact", head: true });
  if (q) count = count.ilike("email", containsPattern(q));
  const { count: total, error: countError } = await count;
  if (countError) throw countError;

  const current = clampPage(page, total ?? 0);
  const from = (current - 1) * PAGE_SIZE;

  let rows = client.from("users").select("id, email, role, created_at");
  if (q) rows = rows.ilike("email", containsPattern(q));
  const { data, error } = await rows
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  return {
    total: total ?? 0,
    page: current,
    rows: (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
    })),
  };
}
