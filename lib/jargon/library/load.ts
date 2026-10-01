import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { fetchProgressStateByDomain, resolveReviewDomainIds } from "@/lib/jargon/known-state";
import { mapDomain } from "@/lib/jargon/mappers";
import { fetchTermIndexByDomain } from "@/lib/jargon/terms";
import type {
  Domain,
  LibraryPageData,
  LibraryTerm,
  UnfinishedLibraryTerm,
} from "@/lib/jargon/types";
import { pickLibraryDomainId } from "./pick-domain";

type Client = SupabaseClient<Database>;

export type LibraryCollections = {
  domains: Domain[];
  /** Server time the counts were read, compared against local edits. */
  loadedAt: number;
};

/** Every collection the user has, with its counts. Cached per request so
 *  the Library layout and page share one read. */
export const loadLibraryCollections = cache(async function loadLibraryCollections(
  client: Client,
  userId: string,
): Promise<LibraryCollections> {
  const loadedAt = Date.now();
  const { reviewDomainIds, collectionRows } = await resolveReviewDomainIds(client, userId);
  const active = new Set(reviewDomainIds);
  const domains = collectionRows.map((row) =>
    mapDomain(row, {
      source: row.source,
      isActiveForReview: active.has(row.id),
      termCount: row.termCount,
      unfinishedCount: row.unfinishedCount,
      knownCount: row.knownCount,
      termsLearnedCount: row.termsLearnedCount,
      markedKnownCount: row.markedKnownCount,
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
      unfinishedTerms.push({ id: row.id, term: row.term, category: row.category });
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
  const collectionsPromise = loadLibraryCollections(client, userId);
  const guess = options.requestedDomainId ?? options.lastDomainId;
  const guessed = guess ? loadDomainTerms(client, guess) : null;
  // A guess for a collection the user no longer has resolves to nothing; keep
  // it from surfacing as an unhandled rejection while the list loads.
  guessed?.catch(() => undefined);

  const { domains } = await collectionsPromise;
  const domainId = pickLibraryDomainId(domains, options);
  if (!domainId) return { kind: "empty" };

  const loaded =
    guessed && guess === domainId ? await guessed : await loadDomainTerms(client, domainId);
  const domain = domains.find((item) => item.id === domainId)!;
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
