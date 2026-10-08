import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pickSpecimen } from "@/lib/collections/pick";
import { showcaseOverride } from "@/lib/collections/showcase-overrides";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/database.types";
import { parseKind, type CollectionKind } from "@/lib/terms/kinds";
import { parseLanguage, type CollectionLanguage } from "@/lib/terms/languages";

export type PublicCollection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  updatedAt: string;
  kind: CollectionKind;
  language: CollectionLanguage;
  /** Only shared collections can be added to a library. */
  canAdd: boolean;
};

const COLLECTION_COLUMNS = "id, slug, name, description, updated_at, kind, language, visibility";

type CollectionRow = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  updated_at: string;
  kind: string;
  language: string;
  visibility: string;
};

function mapPublicCollection(row: CollectionRow): PublicCollection {
  return {
    id: row.id,
    slug: row.slug!,
    name: row.name,
    description: row.description ?? "",
    updatedAt: row.updated_at,
    kind: parseKind(row.kind),
    language: parseLanguage(row.language),
    canAdd: row.visibility === "shared",
  };
}

const TERM_COLUMNS = "slug, term, category, definition, example";

type TermRow = {
  slug: string | null;
  term: string;
  category: string | null;
  definition: string | null;
  example: string | null;
};

/** Public pages show finished terms only: ones with a page and a definition. */
function mapFinishedTerms(rows: TermRow[]): PublicTermSummary[] {
  return rows.flatMap((row) =>
    row.slug && row.definition?.trim()
      ? [
          {
            slug: row.slug,
            term: row.term,
            category: row.category,
            definition: row.definition,
            example: row.example?.trim() ? row.example : null,
          },
        ]
      : [],
  );
}

type PublicCollectionSummary = Pick<
  PublicCollection,
  "id" | "slug" | "name" | "description" | "updatedAt"
>;

export async function listPublicCollectionSummaries(): Promise<PublicCollectionSummary[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name, description, updated_at")
    .eq("is_public", true)
    .not("slug", "is", null)
    .order("name");

  if (error) throw error;

  return (data ?? []).map((collection) => ({
    id: collection.id,
    slug: collection.slug!,
    name: collection.name,
    description: collection.description ?? "",
    updatedAt: collection.updated_at,
  }));
}

export type PublicTermSummary = {
  slug: string;
  term: string;
  category: string | null;
  definition: string;
  example: string | null;
};

export type PublicCollectionPage = {
  collection: PublicCollection;
  /** The newest finished terms, at most `PUBLIC_TERMS_LIMIT`. */
  terms: PublicTermSummary[];
  /** Every finished term in the collection, not just the ones loaded. */
  totalTerms: number;
  /** The term that stands for the collection, picked from the loaded terms. */
  specimen: PublicTermSummary | null;
};

/** A public page never loads a whole collection: some have over a thousand terms. */
const PUBLIC_TERMS_LIMIT = 20;

type Client = SupabaseClient<Database>;

async function loadFinishedTerms(
  supabase: Client,
  collection: PublicCollection,
): Promise<Omit<PublicCollectionPage, "collection">> {
  const [newest, total] = await Promise.all([
    supabase
      .from("terms")
      .select(TERM_COLUMNS)
      .eq("collection_id", collection.id)
      .not("slug", "is", null)
      .not("definition", "is", null)
      .neq("definition", "")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PUBLIC_TERMS_LIMIT),
    supabase
      .from("terms")
      .select("id", { count: "exact", head: true })
      .eq("collection_id", collection.id)
      .not("slug", "is", null)
      .not("definition", "is", null)
      .neq("definition", ""),
  ]);
  if (newest.error) throw newest.error;
  if (total.error) throw total.error;

  const terms = mapFinishedTerms(newest.data ?? []);
  const pinnedSlug = showcaseOverride(collection.slug).specimenTermSlug;
  const specimenPool = [
    ...terms,
    ...(await loadPinnedTerm(supabase, collection.id, pinnedSlug, terms)),
  ];

  return {
    terms,
    totalTerms: total.count ?? terms.length,
    specimen: pickSpecimen(collection.slug, specimenPool, pinnedSlug) ?? null,
  };
}

/** A pinned specimen can be older than the newest terms, so it is fetched on its own. */
async function loadPinnedTerm(
  supabase: Client,
  collectionId: string,
  pinnedSlug: string | undefined,
  loaded: PublicTermSummary[],
): Promise<PublicTermSummary[]> {
  if (!pinnedSlug || loaded.some((term) => term.slug === pinnedSlug)) return [];

  const { data, error } = await supabase
    .from("terms")
    .select(TERM_COLUMNS)
    .eq("collection_id", collectionId)
    .eq("slug", pinnedSlug)
    .maybeSingle();
  if (error) throw error;
  return data ? mapFinishedTerms([data]) : [];
}

async function loadPublicCollections(supabase: Client): Promise<PublicCollection[]> {
  const { data, error } = await supabase
    .from("collections")
    .select(COLLECTION_COLUMNS)
    .eq("is_public", true)
    .not("slug", "is", null)
    .order("name");
  if (error) throw error;
  return (data ?? []).map(mapPublicCollection);
}

/** Every public collection with its newest terms, for the index. */
export async function listPublicCollections(): Promise<PublicCollectionPage[]> {
  const supabase = createPublicClient();
  const collections = await loadPublicCollections(supabase);

  return Promise.all(
    collections.map(async (collection) => ({
      collection,
      ...(await loadFinishedTerms(supabase, collection)),
    })),
  );
}

export const getPublicCollectionPage = cache(async function getPublicCollectionPage(
  collectionSlug: string,
): Promise<PublicCollectionPage | null> {
  const supabase = createPublicClient();

  const { data: collectionRow, error: collectionError } = await supabase
    .from("collections")
    .select(COLLECTION_COLUMNS)
    .eq("slug", collectionSlug)
    .eq("is_public", true)
    .maybeSingle();

  if (collectionError) throw collectionError;
  if (!collectionRow) return null;

  const collection = mapPublicCollection(collectionRow);
  return { collection, ...(await loadFinishedTerms(supabase, collection)) };
});
