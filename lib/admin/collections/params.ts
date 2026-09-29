import { cleanSearch, first, type RawParams } from "@/lib/admin/list-params";

export type CollectionParams = {
  view: "builtin" | "all";
  q: string;
  page: number;
};

export function parseCollectionParams(raw: RawParams): CollectionParams {
  const page = Number.parseInt(first(raw.page) ?? "", 10);
  return {
    view: first(raw.view) === "all" ? "all" : "builtin",
    q: cleanSearch(first(raw.q)),
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 100_000) : 1,
  };
}

export function collectionsHref(params: Partial<CollectionParams>): string {
  const query = new URLSearchParams();
  if (params.view === "all") query.set("view", "all");
  if (params.q) query.set("q", params.q);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const text = query.toString();
  return text ? `/admin/collections?${text}` : "/admin/collections";
}
