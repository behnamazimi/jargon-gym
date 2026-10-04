import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { fetchMyLovedAndReported } from "@/lib/library/browse";
import { fetchDomainStats } from "@/lib/library/collection-domain-tally";
import { fetchUserCollectionDomains } from "@/lib/library/collections";
import { fetchProgressStateByDomain } from "@/lib/mastery/known-state";
import { mapDomain } from "@/lib/terms/mappers";
import { fetchTermIndexByDomain } from "@/lib/terms/terms";
import type {
  Domain,
  LibraryPageData,
  LibraryTerm,
  UnfinishedLibraryTerm,
} from "@/lib/terms/types";
import { isUuid } from "./details";
import { pickLibraryDomainId } from "./pick-domain";

type Client = SupabaseClient<Database>;

export type LibraryCollections = {
  domains: Domain[];
  /** Server time taken before the counts were read, compared against local
   *  edits' save times (lib/library/overrides.ts). */
  loadedAt: number;
};

/** The user's collections without counts: what the page needs to pick and
 *  show one. Cached per request and shared with the layout's counts below. */
const loadLibraryDomainList = cache(async function loadLibraryDomainList(
  client: Client,
  userId: string,
) {
  const [rows, reviewDomainIds] = await Promise.all([
    fetchUserCollectionDomains(client, userId),
    client.rpc("my_review_domain_ids").then(({ data, error }) => {
      if (error) throw error;
      return data ?? [];
    }),
  ]);
  const active = new Set(reviewDomainIds);
  return rows.map((row) => ({ row, isActiveForReview: active.has(row.id) }));
});

/** Every collection with its counts, for the sidebar. Reading the counts
 *  means reading every term's progress, so the page doesn't wait on it. */
export const loadLibraryCollections = cache(async function loadLibraryCollections(
  client: Client,
  userId: string,
): Promise<LibraryCollections> {
  const loadedAt = Date.now();
  const list = await loadLibraryDomainList(client, userId);
  const stats = await fetchDomainStats(
    client,
    list.map(({ row }) => row.id),
  );
  const domains = list.map(({ row, isActiveForReview }) =>
    mapDomain(row, {
      source: row.source,
      isActiveForReview,
      ...stats.get(row.id),
    }),
  );
  return { domains, loadedAt };
});

async function fetchLibraryTermIndex(client: Client, domainId: string) {
  const rows = await fetchTermIndexByDomain(client, domainId);
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
  options: { requestedDomainId?: string; lastDomainId?: string },
): Promise<LibraryLoadResult> {
  // Only the list, not every collection's counts: the page works out the
  // counts it shows from its own terms.
  const listPromise = loadLibraryDomainList(client, userId);
  const guess = [options.requestedDomainId, options.lastDomainId].find((id): id is string =>
    Boolean(id && isUuid(id)),
  );
  const guessed = guess ? loadDomainTerms(client, guess) : null;
  // A guess for a collection the user no longer has resolves to nothing; keep
  // it from surfacing as an unhandled rejection while the list loads.
  guessed?.catch(() => undefined);

  const domains = (await listPromise).map(({ row, isActiveForReview }) =>
    mapDomain(row, { source: row.source, isActiveForReview }),
  );
  const domainId = pickLibraryDomainId(domains, options);
  if (!domainId) return { kind: "empty" };

  const [loaded, mine] = await Promise.all([
    guessed && guess === domainId ? guessed : loadDomainTerms(client, domainId),
    fetchMyLovedAndReported(client, userId, [domainId]),
  ]);
  const domain = {
    ...domains.find((item) => item.id === domainId)!,
    lovedByMe: mine.loved.has(domainId),
    reportedByMe: mine.reported.has(domainId),
  };
  return { kind: "ready", data: { domain, ...loaded } };
}

async function loadDomainTerms(client: Client, domainId: string) {
  const loadedAt = Date.now();
  // Known/unknown is stored per term, not per review pool, so progress is
  // read even when the collection is paused.
  const [index, progress] = await Promise.all([
    fetchLibraryTermIndex(client, domainId),
    fetchProgressStateByDomain(client, [domainId]),
  ]);
  return { ...index, ...progress, loadedAt };
}
