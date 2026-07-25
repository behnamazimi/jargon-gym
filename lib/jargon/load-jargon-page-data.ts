import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { mapDomain, mapTerm } from "./mappers";
import { fetchDomains, fetchKnownTermIds, fetchTermsByDomain } from "./queries";
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

export async function loadJargonPageData(client: Client): Promise<JargonPageData> {
  try {
    const domainRows = await fetchDomains(client);

    if (domainRows.length === 0) {
      throw new JargonDataError("No jargon domains are available yet.");
    }

    const domainRow = domainRows[0];
    const [termRows, knownTermIds] = await Promise.all([
      fetchTermsByDomain(client, domainRow.id),
      fetchKnownTermIds(client),
    ]);

    const terms = termRows.map(mapTerm);
    const termIds = new Set(terms.map((t) => t.id));

    return {
      domain: mapDomain(domainRow),
      domains: domainRows.map(mapDomain),
      terms,
      knownTermIds: knownTermIds.filter((id) => termIds.has(id)),
    };
  } catch (err) {
    throw toJargonDataError(err, "Something went wrong while loading jargon terms.");
  }
}
