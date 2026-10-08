import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { fetchMyLovedAndReported } from "@/lib/library/browse";
import { fetchCollectionStats } from "@/lib/library/collection-tally";
import { fetchUserCollections } from "@/lib/library/collections";
import { fetchProgressStateByCollection } from "@/lib/mastery/known-state";
import { mapCollection } from "@/lib/terms/mappers";
import { fetchTermIndexByCollection } from "@/lib/terms/terms";
import type {
  Collection,
  LibraryPageData,
  LibraryTerm,
  UnfinishedLibraryTerm,
} from "@/lib/terms/types";
import { isUuid } from "./details";
import { pickLibraryCollectionId } from "./pick-collection";

type Client = SupabaseClient<Database>;

export type LibraryCollections = {
  collections: Collection[];
  /** Server time taken before the counts were read, compared against local
   *  edits' save times (lib/library/overrides.ts). */
  loadedAt: number;
};

/** The user's collections without counts: what the page needs to pick and
 *  show one. Cached per request and shared with the layout's counts below. */
const loadLibraryCollectionList = cache(async function loadLibraryCollectionList(
  client: Client,
  userId: string,
) {
  const [rows, reviewCollectionIds] = await Promise.all([
    fetchUserCollections(client, userId),
    client.rpc("my_review_collection_ids").then(({ data, error }) => {
      if (error) throw error;
      return data ?? [];
    }),
  ]);
  const active = new Set(reviewCollectionIds);
  return rows.map((row) => ({ row, isActiveForReview: active.has(row.id) }));
});

/** Every collection with its counts, for the sidebar. Reading the counts
 *  means reading every term's progress, so the page doesn't wait on it. */
export const loadLibraryCollections = cache(async function loadLibraryCollections(
  client: Client,
  userId: string,
): Promise<LibraryCollections> {
  const loadedAt = Date.now();
  const list = await loadLibraryCollectionList(client, userId);
  const stats = await fetchCollectionStats(
    client,
    list.map(({ row }) => row.id),
  );
  const collections = list.map(({ row, isActiveForReview }) =>
    mapCollection(row, {
      source: row.source,
      isActiveForReview,
      ...stats.get(row.id),
    }),
  );
  return { collections, loadedAt };
});

async function fetchLibraryTermIndex(client: Client, collectionId: string) {
  const rows = await fetchTermIndexByCollection(client, collectionId);
  const terms: LibraryTerm[] = [];
  const unfinishedTerms: UnfinishedLibraryTerm[] = [];
  for (const row of rows) {
    if (row.definition === null) {
      unfinishedTerms.push({
        id: row.id,
        term: row.term,
        category: row.category,
      });
    } else {
      terms.push({
        id: row.id,
        term: row.term,
        category: row.category,
        definition: row.definition,
      });
    }
  }
  return { terms, unfinishedTerms };
}

export type LibraryLoadResult = { kind: "empty" } | { kind: "ready"; data: LibraryPageData };

/**
 * One collection's list for the Library. When the collection is already
 * known (from the URL or the last one viewed), its terms load alongside the
 * collection list instead of after it.
 */
export async function loadLibraryPage(
  client: Client,
  userId: string,
  options: { requestedCollectionId?: string; lastCollectionId?: string },
): Promise<LibraryLoadResult> {
  // Only the list, not every collection's counts: the page works out the
  // counts it shows from its own terms.
  const listPromise = loadLibraryCollectionList(client, userId);
  const guess = [options.requestedCollectionId, options.lastCollectionId].find((id): id is string =>
    Boolean(id && isUuid(id)),
  );
  const guessed = guess ? loadCollectionTerms(client, guess) : null;
  // A guess for a collection the user no longer has resolves to nothing; keep
  // it from surfacing as an unhandled rejection while the list loads.
  guessed?.catch(() => undefined);

  const collections = (await listPromise).map(({ row, isActiveForReview }) =>
    mapCollection(row, { source: row.source, isActiveForReview }),
  );
  const collectionId = pickLibraryCollectionId(collections, options);
  if (!collectionId) return { kind: "empty" };

  const [loaded, mine] = await Promise.all([
    guessed && guess === collectionId ? guessed : loadCollectionTerms(client, collectionId),
    fetchMyLovedAndReported(client, userId, [collectionId]),
  ]);
  const collection = {
    ...collections.find((item) => item.id === collectionId)!,
    lovedByMe: mine.loved.has(collectionId),
    reportedByMe: mine.reported.has(collectionId),
  };
  return { kind: "ready", data: { collection, ...loaded } };
}

async function loadCollectionTerms(client: Client, collectionId: string) {
  const loadedAt = Date.now();
  // Known/unknown is stored per term, not per review pool, so progress is
  // read even when the collection is paused.
  const [index, progress] = await Promise.all([
    fetchLibraryTermIndex(client, collectionId),
    fetchProgressStateByCollection(client, [collectionId]),
  ]);
  return { ...index, ...progress, loadedAt };
}
