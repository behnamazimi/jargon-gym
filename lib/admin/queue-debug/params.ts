import { cleanSearch, first, isUuid, type RawParams } from "@/lib/admin/list-params";

export const QUEUE_TABS = ["read", "review", "quiz", "cooldown", "excluded"] as const;
export type QueueTab = (typeof QUEUE_TABS)[number];

export const QUEUE_LIMITS = [25, 50, 100, 250, 500] as const;
const DEFAULT_LIMIT = 50;

export type QueueParams = {
  /** Member search text. */
  q: string;
  userId: string | null;
  /** One collection, or null for all of them. */
  collectionId: string | null;
  tab: QueueTab;
  limit: number;
  /** Page of the member picker. */
  page: number;
};

/** What comes from the address bar is untrusted, so every value is checked and defaulted. */
export function parseQueueParams(raw: RawParams): QueueParams {
  const user = first(raw.user);
  const collection = first(raw.collection);
  const tab = first(raw.tab);
  const limit = Number.parseInt(first(raw.limit) ?? "", 10);
  const page = Number.parseInt(first(raw.page) ?? "", 10);
  return {
    q: cleanSearch(first(raw.q)),
    userId: user && isUuid(user) ? user : null,
    collectionId: collection && isUuid(collection) ? collection : null,
    tab: QUEUE_TABS.find((t) => t === tab) ?? "read",
    limit: QUEUE_LIMITS.find((l) => l === limit) ?? DEFAULT_LIMIT,
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 100_000) : 1,
  };
}

/** An address for the queue page that keeps only what is set. */
export function queueHref(params: Partial<QueueParams>): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.userId) query.set("user", params.userId);
  if (params.collectionId) query.set("collection", params.collectionId);
  if (params.tab && params.tab !== "read") query.set("tab", params.tab);
  if (params.limit && params.limit !== DEFAULT_LIMIT) query.set("limit", String(params.limit));
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const text = query.toString();
  return text ? `/admin/system/queue?${text}` : "/admin/system/queue";
}
