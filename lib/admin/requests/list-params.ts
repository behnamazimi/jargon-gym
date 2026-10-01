import { cleanSearch, first, type RawParams } from "@/lib/admin/list-params";

export type RequestTab = "open" | "needs_input" | "done";

export type RequestListParams = { tab: RequestTab; q: string; page: number };

export function parseRequestParams(raw: RawParams): RequestListParams {
  const tab = first(raw.tab);
  const page = Number.parseInt(first(raw.page) ?? "", 10);
  return {
    tab: tab === "needs_input" || tab === "done" ? tab : "open",
    q: cleanSearch(first(raw.q)),
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 100_000) : 1,
  };
}

/** An address for the requests page that keeps only what is set. */
export function requestsHref(params: Partial<RequestListParams>): string {
  const query = new URLSearchParams();
  if (params.tab && params.tab !== "open") query.set("tab", params.tab);
  if (params.q) query.set("q", params.q);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const text = query.toString();
  return text ? `/admin/requests?${text}` : "/admin/requests";
}
