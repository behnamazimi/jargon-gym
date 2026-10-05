import type { SupabaseClient } from "@supabase/supabase-js";
import { clampPage, PAGE_SIZE } from "@/lib/admin/list-params";
import type { IssueKind, IssueStatus } from "@/lib/issues/schema";
import type { Database } from "@/lib/supabase/database.types";
import { TAB_STATUS, type IssueListParams } from "./list-params";

type Client = SupabaseClient<Database>;

const COLUMNS =
  "id, user_id, kind, body, page_path, user_agent, viewport, screenshot_path, status, created_at, status_changed_at, users(email)";

export type AdminIssue = {
  id: string;
  userId: string;
  reporterEmail: string | null;
  kind: IssueKind;
  body: string;
  pagePath: string | null;
  userAgent: string | null;
  viewport: string | null;
  hasScreenshot: boolean;
  status: IssueStatus;
  createdAt: string;
  statusChangedAt: string | null;
};

type IssueRow = {
  id: string;
  user_id: string;
  kind: string;
  body: string;
  page_path: string | null;
  user_agent: string | null;
  viewport: string | null;
  screenshot_path: string | null;
  status: string;
  created_at: string;
  status_changed_at: string | null;
  users: { email: string } | null;
};

function mapIssue(row: IssueRow): AdminIssue {
  return {
    id: row.id,
    userId: row.user_id,
    reporterEmail: row.users?.email ?? null,
    kind: row.kind as IssueKind,
    body: row.body,
    pagePath: row.page_path,
    userAgent: row.user_agent,
    viewport: row.viewport,
    hasScreenshot: row.screenshot_path !== null,
    status: row.status as IssueStatus,
    createdAt: row.created_at,
    statusChangedAt: row.status_changed_at,
  };
}

export async function listIssues(
  client: Client,
  { tab, kind, page }: IssueListParams,
): Promise<{ rows: AdminIssue[]; total: number; page: number }> {
  let count = client
    .from("issue_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", TAB_STATUS[tab]);
  if (kind !== "all") count = count.eq("kind", kind);
  const { count: total, error: countError } = await count;
  if (countError) throw countError;

  const current = clampPage(page, total ?? 0);
  const from = (current - 1) * PAGE_SIZE;

  let rows = client.from("issue_reports").select(COLUMNS).eq("status", TAB_STATUS[tab]);
  if (kind !== "all") rows = rows.eq("kind", kind);
  const { data, error } = await rows
    .order(tab === "open" ? "created_at" : "status_changed_at", { ascending: false })
    .order("id")
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  return { total: total ?? 0, page: current, rows: (data ?? []).map(mapIssue) };
}

export async function getIssue(client: Client, id: string): Promise<AdminIssue | null> {
  const { data, error } = await client
    .from("issue_reports")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapIssue(data) : null;
}

export async function countNewIssues(client: Client): Promise<number> {
  const { count, error } = await client
    .from("issue_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  if (error) throw error;
  return count ?? 0;
}
