import type { SupabaseClient } from "@supabase/supabase-js";
import { containsPattern } from "@/lib/admin/email-lookup";
import { clampPage, PAGE_SIZE } from "@/lib/admin/list-params";
import { escapeIlike } from "@/lib/jargon/browse";
import type { Database } from "@/lib/supabase/database.types";
import type { RequestListParams, RequestTab } from "./list-params";
import { significantWords, topicsSimilar } from "./similar";

type Client = SupabaseClient<Database>;
type RequestRow = Database["public"]["Tables"]["collection_requests"]["Row"];

const OPEN_STATUSES = ["requested", "in_progress", "merged"];
const TAB_STATUSES: Record<RequestTab, string[]> = {
  open: OPEN_STATUSES,
  needs_input: ["needs_input"],
  done: ["ready", "declined", "cancelled"],
};

export type AdminRequest = {
  id: string;
  userId: string;
  topic: string;
  kind: string;
  language: string;
  level: string | null;
  size: number | null;
  knownTerms: string | null;
  status: string;
  notifyEmail: boolean;
  dueAt: string;
  createdAt: string;
  acceptedAt: string | null;
  question: string | null;
  userReply: string | null;
  repliedAt: string | null;
  declineReason: string | null;
  declineNote: string | null;
  mergedInto: string | null;
  deliveryKind: string | null;
  deliveredDomainId: string | null;
  deliveredTerms: number | null;
  delayNotifiedAt: string | null;
  emailFailed: boolean;
  /** Past its estimate while still waiting for work to finish. */
  overdue: boolean;
};

function mapRequest(row: RequestRow, now: number): AdminRequest {
  return {
    id: row.id,
    userId: row.user_id,
    topic: row.topic,
    kind: row.kind,
    language: row.language,
    level: row.level,
    size: row.size,
    knownTerms: row.known_terms,
    status: row.status,
    notifyEmail: row.notify_email,
    dueAt: row.due_at,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    question: row.question,
    userReply: row.user_reply,
    repliedAt: row.replied_at,
    declineReason: row.decline_reason,
    declineNote: row.decline_note,
    mergedInto: row.merged_into,
    deliveryKind: row.delivery_kind,
    deliveredDomainId: row.delivered_domain_id,
    deliveredTerms: row.delivered_terms,
    delayNotifiedAt: row.delay_notified_at,
    emailFailed: row.email_failed,
    overdue: OPEN_STATUSES.includes(row.status) && new Date(row.due_at).getTime() < now,
  };
}

/** One page of requests: open ones oldest first (the next one to do), finished ones newest first. */
export async function listRequests(
  client: Client,
  { tab, q, page }: RequestListParams,
): Promise<{ rows: AdminRequest[]; total: number; page: number }> {
  let count = client
    .from("collection_requests")
    .select("id", { count: "exact", head: true })
    .in("status", TAB_STATUSES[tab]);
  if (q) count = count.ilike("topic", containsPattern(q));
  const { count: total, error: countError } = await count;
  if (countError) throw countError;

  const current = clampPage(page, total ?? 0);
  const from = (current - 1) * PAGE_SIZE;

  let rows = client.from("collection_requests").select("*").in("status", TAB_STATUSES[tab]);
  if (q) rows = rows.ilike("topic", containsPattern(q));
  const { data, error } = await rows
    .order(tab === "done" ? "updated_at" : "due_at", { ascending: tab !== "done" })
    .order("id")
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const now = Date.now();
  return {
    total: total ?? 0,
    page: current,
    rows: (data ?? []).map((row) => mapRequest(row, now)),
  };
}

export type AdminRequestDetail = AdminRequest & {
  requesterEmail: string | null;
  /** Requests merged into this one, who each get their own copy on delivery. */
  merged: { id: string; topic: string }[];
};

export async function getRequestDetail(
  client: Client,
  id: string,
): Promise<AdminRequestDetail | null> {
  const { data, error } = await client
    .from("collection_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [{ data: requester }, { data: merged }] = await Promise.all([
    client.from("users").select("email").eq("id", data.user_id).maybeSingle(),
    client
      .from("collection_requests")
      .select("id, topic")
      .eq("merged_into", id)
      .eq("status", "merged")
      .order("created_at"),
  ]);

  return {
    ...mapRequest(data, Date.now()),
    requesterEmail: requester?.email ?? null,
    merged: merged ?? [],
  };
}

export type RequestSettings = {
  enabled: boolean;
  paused: boolean;
  estimateDays: number;
  pausedEstimateDays: number;
};

export async function readRequestSettings(client: Client): Promise<RequestSettings> {
  const { data, error } = await client
    .from("collection_request_settings")
    .select("enabled, paused, estimate_days, paused_estimate_days")
    .eq("id", true)
    .single();
  if (error) throw error;
  return {
    enabled: data.enabled,
    paused: data.paused,
    estimateDays: data.estimate_days,
    pausedEstimateDays: data.paused_estimate_days,
  };
}

/** How many requests need the admin: waiting to be accepted, and past their estimate. */
export async function readRequestAttention(
  client: Client,
): Promise<{ waiting: number; overdue: number }> {
  const [waiting, overdue] = await Promise.all([
    client
      .from("collection_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "requested"),
    client
      .from("collection_requests")
      .select("id", { count: "exact", head: true })
      .in("status", OPEN_STATUSES)
      .lt("due_at", new Date().toISOString()),
  ]);
  if (waiting.error) throw waiting.error;
  if (overdue.error) throw overdue.error;
  return { waiting: waiting.count ?? 0, overdue: overdue.count ?? 0 };
}

export async function findSimilarCollections(
  client: Client,
  topic: string,
): Promise<{ id: string; name: string; terms: number }[]> {
  const words = significantWords(topic);
  if (words.length === 0) return [];

  const filter = words.map((word) => `name.ilike."%${escapeIlike(word)}%"`).join(",");
  const { data, error } = await client
    .from("domains")
    .select("id, name, terms(count)")
    .eq("visibility", "shared")
    .or(filter)
    .order("name")
    .limit(5);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const counted = row.terms as { count: number }[] | { count: number } | null;
    const terms = Array.isArray(counted) ? (counted[0]?.count ?? 0) : (counted?.count ?? 0);
    return { id: row.id, name: row.name, terms };
  });
}

/** Other open requests on a similar topic in the same language, which could be merged. */
export async function findSimilarRequests(
  client: Client,
  request: Pick<AdminRequest, "id" | "topic" | "language" | "kind">,
): Promise<{ id: string; topic: string; status: string }[]> {
  const { data, error } = await client
    .from("collection_requests")
    .select("id, topic, status")
    .in("status", ["requested", "in_progress"])
    .eq("language", request.language)
    .eq("kind", request.kind)
    .neq("id", request.id)
    .limit(200);
  if (error) throw error;
  return (data ?? []).filter((row) => topicsSimilar(row.topic, request.topic));
}
