import type { Term } from "@/lib/jargon/types";

export type CollectionExport = { terms: Term[] } | { error: string };

/** A collection's terms in full, read when the export dialog opens. Never
 *  rejects, so the dialog can read it with use(). */
export async function fetchCollectionExport(domainId: string): Promise<CollectionExport> {
  try {
    const response = await fetch(`/api/jargon/collections/${domainId}/export`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { terms } = (await response.json()) as { terms: Term[] };
    return { terms };
  } catch {
    return { error: "Couldn't load this collection. Try again." };
  }
}
