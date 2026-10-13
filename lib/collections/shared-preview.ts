import { cache } from "react";
import { isUuid } from "@/lib/library/details";
import { createPublicClient } from "@/lib/supabase/public";
import { parseKind, type CollectionKind } from "@/lib/terms/kinds";
import { parseLanguage, type CollectionLanguage } from "@/lib/terms/languages";
import type { PublicTermSummary } from "@/lib/terms/public-terms";

export type SharedCollectionPreview = {
  id: string;
  name: string;
  description: string;
  kind: CollectionKind;
  language: CollectionLanguage;
  /** Set for a built-in with its own public page; the link redirects there. */
  publicSlug: string | null;
  /** Every finished term, not just the ones picked. */
  totalTerms: number;
  /** Up to 10 finished terms, picked at random on every load. */
  terms: Pick<PublicTermSummary, "term" | "definition" | "example">[];
};

type PreviewRow = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  language: string;
  is_public: boolean;
  slug: string | null;
  term_count: number;
  terms: { term: string; definition: string; example: string | null }[];
};

/** A shared collection as its link shows it; null when it isn't shared (any more). */
export const getSharedCollectionPreview = cache(
  async (collectionId: string): Promise<SharedCollectionPreview | null> => {
    if (!isUuid(collectionId)) return null;

    const { data, error } = await createPublicClient().rpc("get_shared_collection_preview", {
      p_collection_id: collectionId,
    });
    if (error) throw error;
    if (!data) return null;

    const row = data as unknown as PreviewRow;
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      kind: parseKind(row.kind),
      language: parseLanguage(row.language),
      publicSlug: row.is_public && row.slug ? row.slug : null,
      totalTerms: row.term_count,
      terms: row.terms.map((term) => ({
        term: term.term,
        definition: term.definition,
        example: term.example?.trim() ? term.example : null,
      })),
    };
  },
);
