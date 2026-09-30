import type { SupabaseClient } from "@supabase/supabase-js";
import { clampPage, PAGE_SIZE } from "@/lib/admin/list-params";
import type { Database, Json } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type AuditRow = {
  id: number;
  createdAt: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Json;
};

const COLUMNS = "id, created_at, actor_email, action, target_type, target_id, details";

function toRow(
  row: Omit<Database["public"]["Tables"]["admin_audit_log"]["Row"], "actor_id">,
): AuditRow {
  return {
    id: row.id,
    createdAt: row.created_at,
    actorEmail: row.actor_email,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    details: row.details,
  };
}

/** One page of the audit trail, newest first. Only admins can read it. */
export async function listAudit(
  client: Client,
  { action, page }: { action: string | null; page: number },
): Promise<{ rows: AuditRow[]; total: number; page: number }> {
  let count = client.from("admin_audit_log").select("id", { count: "exact", head: true });
  if (action) count = count.eq("action", action);
  const { count: total, error: countError } = await count;
  if (countError) throw countError;

  const current = clampPage(page, total ?? 0);
  const from = (current - 1) * PAGE_SIZE;

  let rows = client.from("admin_audit_log").select(COLUMNS);
  if (action) rows = rows.eq("action", action);
  const { data, error } = await rows
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  return { total: total ?? 0, page: current, rows: (data ?? []).map(toRow) };
}

/** The latest few entries, for the Overview. */
export async function recentAudit(client: Client, limit: number): Promise<AuditRow[]> {
  const { data, error } = await client
    .from("admin_audit_log")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toRow);
}

/** What admins did to one person, or to their waitlist request, newest first. */
export async function listAuditForPerson(
  client: Client,
  {
    userId,
    waitlistRequestId,
    limit,
  }: { userId: string; waitlistRequestId: string | null; limit: number },
): Promise<AuditRow[]> {
  const ids = waitlistRequestId ? [userId, waitlistRequestId] : [userId];
  const { data, error } = await client
    .from("admin_audit_log")
    .select(COLUMNS)
    .in("target_type", ["user", "waitlist_request"])
    .in("target_id", ids)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toRow);
}

/** Emails for the people that entries are about, so the trail reads as names, not ids.
 *  They are looked up when shown and never copied into the log. */
export async function emailsForTargets(
  client: Client,
  rows: AuditRow[],
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(
      rows.flatMap((row) => (row.targetType === "user" && row.targetId ? [row.targetId] : [])),
    ),
  ];
  if (ids.length === 0) return new Map();

  const { data, error } = await client.from("users").select("id, email").in("id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((user) => [user.id, user.email]));
}
