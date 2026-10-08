import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { attachRelationshipsToTerms, mapCollection, mapTermsByState } from "@/lib/terms/mappers";
import {
  fetchProgressStateByCollection,
  resolveReviewCollectionIds,
} from "@/lib/mastery/known-state";
import { fetchTermRelationshipsForCollection, fetchTermsByCollection } from "@/lib/terms/terms";
import type { FullLibraryPageData } from "@/lib/terms/types";

type Client = SupabaseClient<Database>;

export const NO_COLLECTIONS_MESSAGE = "You don't have any collections yet.";

export class LibraryDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LibraryDataError";
  }
}

function toLibraryDataError(err: unknown, fallback: string): LibraryDataError {
  if (err instanceof LibraryDataError) return err;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return new LibraryDataError(err.message);
  }
  return new LibraryDataError(fallback);
}

type LoadOptions = {
  selectedCollectionId?: string;
  userId: string;
};

export async function loadLibraryPageData(
  client: Client,
  options: LoadOptions,
): Promise<FullLibraryPageData> {
  try {
    const { userId, selectedCollectionId } = options;

    const { reviewCollectionIds, collectionRows } = await resolveReviewCollectionIds(
      client,
      userId,
    );

    if (collectionRows.length === 0) {
      throw new LibraryDataError(NO_COLLECTIONS_MESSAGE);
    }

    const activeSet = new Set(reviewCollectionIds);
    const collections = collectionRows.map((row) =>
      mapCollection(row, {
        source: row.source,
        isActiveForReview: activeSet.has(row.id),
        termCount: row.termCount,
        unfinishedCount: row.unfinishedCount,
        knownCount: row.knownCount,
        termsLearnedCount: row.termsLearnedCount,
        markedKnownCount: row.markedKnownCount,
      }),
    );

    const selectedRow =
      (selectedCollectionId
        ? collectionRows.find((row) => row.id === selectedCollectionId)
        : undefined) ??
      collectionRows.find((row) => activeSet.has(row.id)) ??
      collectionRows[0];

    const collection = mapCollection(selectedRow, {
      source: selectedRow.source,
      isActiveForReview: activeSet.has(selectedRow.id),
      termCount: selectedRow.termCount,
      unfinishedCount: selectedRow.unfinishedCount,
      knownCount: selectedRow.knownCount,
      termsLearnedCount: selectedRow.termsLearnedCount,
      markedKnownCount: selectedRow.markedKnownCount,
    });

    // Known/unknown is stored per term, not per review pool. Fetch for the
    // selected collection even when it's paused — reviewCollectionIds would omit
    // it and the collection page would paint every known term as unknown.
    const [termRows, progressState, relationshipRows] = await Promise.all([
      fetchTermsByCollection(client, selectedRow.id),
      fetchProgressStateByCollection(client, [selectedRow.id]),
      fetchTermRelationshipsForCollection(client, selectedRow.id),
    ]);
    const { terms: mappedTerms, unfinishedTerms } = mapTermsByState(termRows);
    const { knownTermIds, markedKnownTermIds, everMasteredTermIds } = progressState;
    const terms = attachRelationshipsToTerms(mappedTerms, relationshipRows);

    return {
      collection,
      collections,
      terms,
      unfinishedTerms,
      knownTermIds,
      markedKnownTermIds,
      everMasteredTermIds,
      activeCollectionIds: reviewCollectionIds,
    };
  } catch (err) {
    throw toLibraryDataError(err, "Couldn't load your library. Refresh the page or try again.");
  }
}
