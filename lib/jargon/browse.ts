import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { SharedDomain } from "@/lib/jargon/types";

type Client = SupabaseClient<Database>;

const BROWSE_PAGE_SIZE = 12;

export type BrowseCollectionFilter = "all" | "available" | "in-collection";

export type BrowseCounts = {
  all: number;
  available: number;
  inCollection: number;
};

export type BrowsePageResult = {
  domains: SharedDomain[];
  nextOffset: number | null;
  counts: BrowseCounts;
};

export type BrowseQuery = {
  search?: string;
  filter?: BrowseCollectionFilter;
  offset?: number;
  limit?: number;
};

const DOMAIN_SELECT = "id, name, description, owner_id, terms(count)" as const;

type DomainRow = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  terms: { count: number }[] | { count: number } | null;
};

export function escapeIlike(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export function browseSearchOr(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const pattern = `%${escapeIlike(trimmed)}%`.replaceAll('"', '\\"');
  return `name.ilike."${pattern}",description.ilike."${pattern}"`;
}

function termCount(terms: DomainRow["terms"]) {
  if (!terms) return 0;
  if (Array.isArray(terms)) return terms[0]?.count ?? 0;
  return terms.count ?? 0;
}

function mapDomain(row: DomainRow, inCollection: Set<string>): SharedDomain {
  return {
    id: row.id,
    name: row.name,
    icon: "",
    description: row.description ?? "",
    ownerId: row.owner_id,
    termCount: termCount(row.terms),
    inCollection: inCollection.has(row.id),
  };
}

async function fetchCollectionIds(client: Client, userId: string) {
  const { data, error } = await client
    .from("user_collection_domains")
    .select("domain_id")
    .eq("user_id", userId);

  if (error) throw error;
  return data.map((row) => row.domain_id);
}

function applyBrowseFilters<
  Query extends {
    eq: (column: "visibility", value: "shared") => Query;
    neq: (column: "owner_id", value: string) => Query;
    or: (filters: string) => Query;
    in: (column: "id", values: string[]) => Query;
    not: (column: "id", operator: "in", value: string) => Query;
  },
>(
  query: Query,
  userId: string,
  search: string,
  filter: BrowseCollectionFilter,
  collectionIds: string[],
): Query | null {
  let next = query.eq("visibility", "shared").neq("owner_id", userId);
  const searchOr = browseSearchOr(search);
  if (searchOr) next = next.or(searchOr);

  if (filter === "in-collection") {
    if (collectionIds.length === 0) return null;
    return next.in("id", collectionIds);
  }

  if (filter === "available" && collectionIds.length > 0) {
    return next.not("id", "in", `(${collectionIds.join(",")})`);
  }

  return next;
}

async function countMatching(
  client: Client,
  userId: string,
  search: string,
  filter: BrowseCollectionFilter,
  collectionIds: string[],
) {
  const scoped = applyBrowseFilters(
    client.from("domains").select("id", { count: "exact", head: true }),
    userId,
    search,
    filter,
    collectionIds,
  );

  if (!scoped) return 0;

  const { count, error } = await scoped;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchSharedDomainsBrowse(
  client: Client,
  userId: string,
  query: BrowseQuery = {},
): Promise<BrowsePageResult> {
  const search = query.search ?? "";
  const filter = query.filter ?? "all";
  const offset = query.offset ?? 0;
  const limit = query.limit ?? BROWSE_PAGE_SIZE;

  const collectionIds = await fetchCollectionIds(client, userId);
  const inCollection = new Set(collectionIds);

  const [all, available, inCollectionCount] = await Promise.all([
    countMatching(client, userId, search, "all", collectionIds),
    countMatching(client, userId, search, "available", collectionIds),
    countMatching(client, userId, search, "in-collection", collectionIds),
  ]);

  const counts: BrowseCounts = { all, available, inCollection: inCollectionCount };
  const matching =
    filter === "available" ? available : filter === "in-collection" ? inCollectionCount : all;

  if (matching === 0) {
    return { domains: [], nextOffset: null, counts };
  }

  const pageQuery = applyBrowseFilters(
    client.from("domains").select(DOMAIN_SELECT),
    userId,
    search,
    filter,
    collectionIds,
  );

  if (!pageQuery) {
    return { domains: [], nextOffset: null, counts };
  }

  const { data, error } = await pageQuery.order("name").range(offset, offset + limit - 1);
  if (error) throw error;

  const domains = ((data ?? []) as unknown as DomainRow[]).map((row) =>
    mapDomain(row, inCollection),
  );
  const loaded = offset + domains.length;

  return {
    domains,
    nextOffset: loaded < matching ? loaded : null,
    counts,
  };
}
