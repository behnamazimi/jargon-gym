import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { SharedCollection } from "@/lib/terms/types";

type Client = SupabaseClient<Database>;

const BROWSE_PAGE_SIZE = 12;

export type BrowseCollectionFilter = "all" | "available" | "in-collection";

export type BrowseGroup = "builtin" | "community";

export function parseBrowseGroup(value: string | undefined): BrowseGroup {
  return value === "community" ? "community" : "builtin";
}

export type BrowseCounts = {
  all: number;
  available: number;
  inCollection: number;
  /** Search matches per group, ignoring the status filter. */
  groups: Record<BrowseGroup, number>;
};

export type BrowsePageResult = {
  collections: SharedCollection[];
  nextOffset: number | null;
  counts: BrowseCounts;
};

export type BrowseSort = "name" | "loved";

export type BrowseQuery = {
  search?: string;
  filter?: BrowseCollectionFilter;
  group?: BrowseGroup;
  sort?: BrowseSort;
  offset?: number;
  limit?: number;
};

const COLLECTION_SELECT =
  "id, name, description, owner_id, is_builtin, love_count, terms(count)" as const;

type CollectionRow = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_builtin: boolean;
  love_count: number;
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

function termCount(terms: CollectionRow["terms"]) {
  if (!terms) return 0;
  if (Array.isArray(terms)) return terms[0]?.count ?? 0;
  return terms.count ?? 0;
}

function mapCollection(
  row: CollectionRow,
  inCollection: Set<string>,
  loved: Set<string>,
  reported: Set<string>,
): SharedCollection {
  return {
    id: row.id,
    name: row.name,
    icon: "",
    description: row.description ?? "",
    ownerId: row.owner_id,
    termCount: termCount(row.terms),
    inCollection: inCollection.has(row.id),
    isBuiltin: row.is_builtin,
    loveCount: row.love_count,
    lovedByMe: loved.has(row.id),
    reportedByMe: reported.has(row.id),
  };
}

async function fetchCollectionIds(client: Client, userId: string) {
  const { data, error } = await client
    .from("user_collections")
    .select("collection_id")
    .eq("user_id", userId);

  if (error) throw error;
  return data.map((row) => row.collection_id);
}

export async function fetchMyLovedAndReported(
  client: Client,
  userId: string,
  collectionIds: string[],
) {
  if (collectionIds.length === 0) return { loved: new Set<string>(), reported: new Set<string>() };

  const [loves, reports] = await Promise.all([
    client
      .from("collection_loves")
      .select("collection_id")
      .eq("user_id", userId)
      .in("collection_id", collectionIds),
    client
      .from("collection_reports")
      .select("collection_id")
      .eq("reporter_id", userId)
      .eq("status", "open")
      .in("collection_id", collectionIds),
  ]);
  if (loves.error) throw loves.error;
  if (reports.error) throw reports.error;

  return {
    loved: new Set(loves.data.map((row) => row.collection_id)),
    reported: new Set(reports.data.map((row) => row.collection_id)),
  };
}

function applyBrowseFilters<
  Query extends {
    eq(column: "visibility", value: "shared"): Query;
    eq(column: "is_builtin", value: boolean): Query;
    neq: (column: "owner_id", value: string) => Query;
    or: (filters: string) => Query;
    in: (column: "id", values: string[]) => Query;
    is: (column: "share_blocked_at", value: null) => Query;
    not: (column: "id", operator: "in", value: string) => Query;
  },
>(
  query: Query,
  userId: string,
  search: string,
  filter: BrowseCollectionFilter,
  collectionIds: string[],
  group?: BrowseGroup,
): Query | null {
  let next = query.eq("visibility", "shared").is("share_blocked_at", null).neq("owner_id", userId);
  if (group) next = next.eq("is_builtin", group === "builtin");
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
  group?: BrowseGroup,
) {
  const scoped = applyBrowseFilters(
    client.from("collections").select("id", { count: "exact", head: true }),
    userId,
    search,
    filter,
    collectionIds,
    group,
  );

  if (!scoped) return 0;

  const { count, error } = await scoped;
  if (error) throw error;
  return count ?? 0;
}

function resolveBrowseQuery(query: BrowseQuery) {
  return {
    search: query.search ?? "",
    filter: query.filter ?? "all",
    group: query.group,
    sort: query.sort ?? "name",
    offset: query.offset ?? 0,
    limit: query.limit ?? BROWSE_PAGE_SIZE,
  };
}

function selectMatchingCount(filter: BrowseCollectionFilter, counts: BrowseCounts): number {
  if (filter === "available") return counts.available;
  if (filter === "in-collection") return counts.inCollection;
  return counts.all;
}

export async function fetchSharedCollectionsBrowse(
  client: Client,
  userId: string,
  query: BrowseQuery = {},
): Promise<BrowsePageResult> {
  const { search, filter, group, sort, offset, limit } = resolveBrowseQuery(query);

  const collectionIds = await fetchCollectionIds(client, userId);
  const inCollection = new Set(collectionIds);

  const [builtinTotal, communityTotal, inCollectionCount] = await Promise.all([
    countMatching(client, userId, search, "all", collectionIds, "builtin"),
    countMatching(client, userId, search, "all", collectionIds, "community"),
    countMatching(client, userId, search, "in-collection", collectionIds, group),
  ]);
  const groups = { builtin: builtinTotal, community: communityTotal };
  const all = group ? groups[group] : builtinTotal + communityTotal;

  // "available" and "in-collection" exactly partition "all" — applyBrowseFilters
  // applies them as complementary id-in-collectionIds filters over the same
  // base predicate (and group) "all" uses, so every matching row is in exactly
  // one of the two. Re-verify this identity before relying on it if a new
  // filter dimension is ever added here.
  const available = all - inCollectionCount;
  const counts: BrowseCounts = {
    all,
    available,
    inCollection: inCollectionCount,
    groups,
  };
  const matching = selectMatchingCount(filter, counts);

  if (matching === 0) {
    return { collections: [], nextOffset: null, counts };
  }

  const pageQuery = applyBrowseFilters(
    client.from("collections").select(COLLECTION_SELECT),
    userId,
    search,
    filter,
    collectionIds,
    group,
  );

  if (!pageQuery) {
    return { collections: [], nextOffset: null, counts };
  }

  const ordered =
    sort === "loved"
      ? pageQuery.order("love_count", { ascending: false }).order("name").order("id")
      : pageQuery.order("name").order("id");
  const { data, error } = await ordered.range(offset, offset + limit - 1);
  if (error) throw error;

  const rows = (data ?? []) as unknown as CollectionRow[];
  const { loved, reported } = await fetchMyLovedAndReported(
    client,
    userId,
    rows.map((row) => row.id),
  );
  const collections = rows.map((row) => mapCollection(row, inCollection, loved, reported));
  const loaded = offset + collections.length;

  return {
    collections,
    nextOffset: loaded < matching ? loaded : null,
    counts,
  };
}
