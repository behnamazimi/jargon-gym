import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { attachRelationshipsToTerms, mapDomain, mapTermsByState } from "./mappers";
import { fetchProgressStateByDomain, resolveReviewDomainIds } from "./known-state";
import { fetchTermRelationshipsForDomain, fetchTermsByDomain } from "./terms";
import type { JargonPageData } from "./types";

type Client = SupabaseClient<Database>;

export const NO_COLLECTIONS_MESSAGE = "You don't have any collections yet.";

export class JargonDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JargonDataError";
  }
}

function toJargonDataError(err: unknown, fallback: string): JargonDataError {
  if (err instanceof JargonDataError) return err;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return new JargonDataError(err.message);
  }
  return new JargonDataError(fallback);
}

type LoadOptions = {
  selectedDomainId?: string;
  userId: string;
};

export async function loadJargonPageData(
  client: Client,
  options: LoadOptions,
): Promise<JargonPageData> {
  try {
    const { userId, selectedDomainId } = options;

    const { reviewDomainIds, collectionRows } = await resolveReviewDomainIds(client, userId);

    if (collectionRows.length === 0) {
      throw new JargonDataError(NO_COLLECTIONS_MESSAGE);
    }

    const activeSet = new Set(reviewDomainIds);
    const domains = collectionRows.map((row) =>
      mapDomain(row, {
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
      (selectedDomainId ? collectionRows.find((row) => row.id === selectedDomainId) : undefined) ??
      collectionRows.find((row) => activeSet.has(row.id)) ??
      collectionRows[0];

    const domain = mapDomain(selectedRow, {
      source: selectedRow.source,
      isActiveForReview: activeSet.has(selectedRow.id),
      termCount: selectedRow.termCount,
      unfinishedCount: selectedRow.unfinishedCount,
      knownCount: selectedRow.knownCount,
      termsLearnedCount: selectedRow.termsLearnedCount,
      markedKnownCount: selectedRow.markedKnownCount,
    });

    // Known/unknown is stored per term, not per review pool. Fetch for the
    // selected collection even when it's paused — reviewDomainIds would omit
    // it and the collection page would paint every known term as unknown.
    const [termRows, progressState, relationshipRows] = await Promise.all([
      fetchTermsByDomain(client, selectedRow.id),
      fetchProgressStateByDomain(client, [selectedRow.id]),
      fetchTermRelationshipsForDomain(client, selectedRow.id),
    ]);
    const { terms: mappedTerms, unfinishedTerms } = mapTermsByState(termRows);
    const { knownTermIds, markedKnownTermIds, everMasteredTermIds } = progressState;
    const terms = attachRelationshipsToTerms(mappedTerms, relationshipRows);

    return {
      domain,
      domains,
      terms,
      unfinishedTerms,
      knownTermIds,
      markedKnownTermIds,
      everMasteredTermIds,
      activeDomainIds: reviewDomainIds,
    };
  } catch (err) {
    throw toJargonDataError(err, "Couldn't load your collection. Refresh the page or try again.");
  }
}
