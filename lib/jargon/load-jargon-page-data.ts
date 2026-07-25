import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { mapDomain, mapTerm } from "./mappers";
import {
  fetchActiveDomainIds,
  fetchKnownTermIdsForDomains,
  fetchTermsByDomain,
  fetchUserCollection,
} from "./queries";
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

    const [collectionRows, activeDomainIds] = await Promise.all([
      fetchUserCollection(client, userId),
      fetchActiveDomainIds(client, userId),
    ]);

    if (collectionRows.length === 0) {
      throw new JargonDataError("No jargon domains in your collection yet.");
    }

    const activeSet = new Set(activeDomainIds);
    const domains = collectionRows.map((row) =>
      mapDomain(row, {
        source: row.source,
        isActiveForReview: activeSet.has(row.id),
        termCount: row.termCount,
        knownCount: row.knownCount,
      }),
    );

    const reviewDomainIds =
      activeDomainIds.length > 0
        ? activeDomainIds.filter((id) => collectionRows.some((row) => row.id === id))
        : collectionRows.map((row) => row.id);

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

    const [termRows, knownTermIds] = await Promise.all([
      fetchTermsByDomain(client, selectedRow.id),
      fetchKnownTermIdsForDomains(client, reviewDomainIds),
    ]);

    const terms = termRows.map(mapTerm);
    const termIds = new Set(terms.map((t) => t.id));

    return {
      domain,
      domains,
      terms,
      knownTermIds: knownTermIds.filter((id) => termIds.has(id)),
      activeDomainIds: reviewDomainIds,
    };
  } catch (err) {
    throw toJargonDataError(err, "Something went wrong while loading jargon terms.");
  }
}
