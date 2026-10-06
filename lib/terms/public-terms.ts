import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pickSpecimen } from "@/lib/collections/pick";
import { showcaseOverride } from "@/lib/collections/showcase-overrides";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/database.types";
import { parseKind, type CollectionKind } from "@/lib/terms/kinds";
import { parseLanguage, type DomainLanguage } from "@/lib/terms/languages";

export type PublicDomain = {
  id: string;
  slug: string;
  name: string;
  description: string;
  updatedAt: string;
  kind: CollectionKind;
  language: DomainLanguage;
  /** Only shared collections can be added to a library. */
  canAdd: boolean;
};

const DOMAIN_COLUMNS = "id, slug, name, description, updated_at, kind, language, visibility";

type DomainRow = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  updated_at: string;
  kind: string;
  language: string;
  visibility: string;
};

function mapPublicDomain(row: DomainRow): PublicDomain {
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

type PublicDomainSummary = Pick<PublicDomain, "id" | "slug" | "name" | "description" | "updatedAt">;

export async function listPublicDomains(): Promise<PublicDomainSummary[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("domains")
    .select("id, slug, name, description, updated_at")
    .eq("is_public", true)
    .not("slug", "is", null)
    .order("name");

  if (error) throw error;

  return (data ?? []).map((domain) => ({
    id: domain.id,
    slug: domain.slug!,
    name: domain.name,
    description: domain.description ?? "",
    updatedAt: domain.updated_at,
  }));
}

export type PublicTermSummary = {
  slug: string;
  term: string;
  category: string | null;
  definition: string;
  example: string | null;
};

export type PublicDomainPage = {
  domain: PublicDomain;
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
  domain: PublicDomain,
): Promise<Omit<PublicDomainPage, "domain">> {
  const [newest, total] = await Promise.all([
    supabase
      .from("terms")
      .select(TERM_COLUMNS)
      .eq("domain_id", domain.id)
      .not("slug", "is", null)
      .not("definition", "is", null)
      .neq("definition", "")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PUBLIC_TERMS_LIMIT),
    supabase
      .from("terms")
      .select("id", { count: "exact", head: true })
      .eq("domain_id", domain.id)
      .not("slug", "is", null)
      .not("definition", "is", null)
      .neq("definition", ""),
  ]);
  if (newest.error) throw newest.error;
  if (total.error) throw total.error;

  const terms = mapFinishedTerms(newest.data ?? []);
  const pinnedSlug = showcaseOverride(domain.slug).specimenTermSlug;
  const specimenPool = [
    ...terms,
    ...(await loadPinnedTerm(supabase, domain.id, pinnedSlug, terms)),
  ];

  return {
    terms,
    totalTerms: total.count ?? terms.length,
    specimen: pickSpecimen(domain.slug, specimenPool, pinnedSlug) ?? null,
  };
}

/** A pinned specimen can be older than the newest terms, so it is fetched on its own. */
async function loadPinnedTerm(
  supabase: Client,
  domainId: string,
  pinnedSlug: string | undefined,
  loaded: PublicTermSummary[],
): Promise<PublicTermSummary[]> {
  if (!pinnedSlug || loaded.some((term) => term.slug === pinnedSlug)) return [];

  const { data, error } = await supabase
    .from("terms")
    .select(TERM_COLUMNS)
    .eq("domain_id", domainId)
    .eq("slug", pinnedSlug)
    .maybeSingle();
  if (error) throw error;
  return data ? mapFinishedTerms([data]) : [];
}

async function loadPublicDomains(supabase: Client): Promise<PublicDomain[]> {
  const { data, error } = await supabase
    .from("domains")
    .select(DOMAIN_COLUMNS)
    .eq("is_public", true)
    .not("slug", "is", null)
    .order("name");
  if (error) throw error;
  return (data ?? []).map(mapPublicDomain);
}

/** Every public collection with its newest terms, for the index. */
export async function listPublicCollections(): Promise<PublicDomainPage[]> {
  const supabase = createPublicClient();
  const domains = await loadPublicDomains(supabase);

  return Promise.all(
    domains.map(async (domain) => ({ domain, ...(await loadFinishedTerms(supabase, domain)) })),
  );
}

export const getPublicDomainPage = cache(async function getPublicDomainPage(
  domainSlug: string,
): Promise<PublicDomainPage | null> {
  const supabase = createPublicClient();

  const { data: domainRow, error: domainError } = await supabase
    .from("domains")
    .select(DOMAIN_COLUMNS)
    .eq("slug", domainSlug)
    .eq("is_public", true)
    .maybeSingle();

  if (domainError) throw domainError;
  if (!domainRow) return null;

  const domain = mapPublicDomain(domainRow);
  return { domain, ...(await loadFinishedTerms(supabase, domain)) };
});
