import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { attachRelationshipsToTerms, mapDomain, mapTerm } from "./mappers";
import { fetchProgressStateByDomain, resolveReviewDomainIds } from "./known-state";
import { fetchTermRelationshipsForTerms, fetchTermsByDomain } from "./terms";
import type { JargonPageData } from "./types";

type Client = SupabaseClient<Database>;

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
      throw new JargonDataError("You don't have any collections yet.");
    }

    const activeSet = new Set(reviewDomainIds);
    const domains = collectionRows.map((row) =>
      mapDomain(row, {
        source: row.source,
        isActiveForReview: activeSet.has(row.id),
        termCount: row.termCount,
        knownCount: row.knownCount,
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
      knownCount: selectedRow.knownCount,
    });

    // Known/unknown is stored per term, not per review pool. Fetch for the
    // selected collection even when it's paused — reviewDomainIds would omit
    // it and the collection page would paint every known term as unknown.
    const termRows = await fetchTermsByDomain(client, selectedRow.id);
    const mappedTerms = termRows.map(mapTerm);
    const termIds = mappedTerms.map((term) => term.id);
    const [progressState, relationshipRows] = await Promise.all([
      fetchProgressStateByDomain(client, [selectedRow.id]),
      fetchTermRelationshipsForTerms(client, termIds),
    ]);
    const { knownTermIds, overallStrengthByTermId } = progressState;
    const terms = attachRelationshipsToTerms(mappedTerms, relationshipRows);

    return {
      domain,
      domains,
      terms,
      knownTermIds,
      activeDomainIds: reviewDomainIds,
      overallStrengthByTermId,
    };
  } catch (err) {
    throw toJargonDataError(err, "Couldn't load your collection. Refresh the page or try again.");
  }
}
