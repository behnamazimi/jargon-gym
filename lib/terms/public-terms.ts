import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { attachRelationshipsToTerms, mapTerm } from "@/lib/terms/mappers";
import type { TermRelationshipLink } from "@/lib/terms/types";
import { parseKind, type CollectionKind } from "@/lib/terms/kinds";
import { parseLanguage, type DomainLanguage } from "@/lib/terms/languages";

export type PublicTermPath = {
  domainSlug: string;
  termSlug: string;
};

export async function listPublicTermPaths(): Promise<PublicTermPath[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("domains")
    .select("slug, terms(slug)")
    .eq("is_public", true)
    .not("slug", "is", null);

  if (error) throw error;

  return (data ?? []).flatMap((domain) =>
    (domain.terms ?? [])
      .filter((term): term is { slug: string } => Boolean(term.slug))
      .map((term) => ({ domainSlug: domain.slug!, termSlug: term.slug })),
  );
}

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

type PublicDomainSummary = Pick<
  PublicDomain,
  "id" | "slug" | "name" | "description" | "updatedAt"
> & {
  termCount: number;
};

export async function listPublicDomains(): Promise<PublicDomainSummary[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("domains")
    .select("id, slug, name, description, updated_at, terms(count)")
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
    termCount: domain.terms?.[0]?.count ?? 0,
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
  terms: PublicTermSummary[];
};

/** Every public collection with its finished terms, for the index. */
export async function listPublicCollections(): Promise<PublicDomainPage[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("domains")
    .select(`${DOMAIN_COLUMNS}, terms(${TERM_COLUMNS})`)
    .eq("is_public", true)
    .not("slug", "is", null)
    .order("name");
  if (error) throw error;

  return (data ?? []).map(({ terms, ...row }) => ({
    domain: mapPublicDomain(row),
    terms: mapFinishedTerms(terms ?? []),
  }));
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

  const { data: termRows, error: termsError } = await supabase
    .from("terms")
    .select(TERM_COLUMNS)
    .eq("domain_id", domainRow.id)
    .not("slug", "is", null)
    .order("term");
  if (termsError) throw termsError;

  return { domain: mapPublicDomain(domainRow), terms: mapFinishedTerms(termRows ?? []) };
});

export type PublicTermPage = {
  domain: PublicDomain;
  term: ReturnType<typeof mapTerm> & { slug: string; updatedAt: string };
  relatedTermSlugsById: Map<string, string>;
};

export const getPublicTermPage = cache(async function getPublicTermPage(
  domainSlug: string,
  termSlug: string,
): Promise<PublicTermPage | null> {
  const supabase = createPublicClient();

  const { data: domainRow, error: domainError } = await supabase
    .from("domains")
    .select(DOMAIN_COLUMNS)
    .eq("slug", domainSlug)
    .eq("is_public", true)
    .maybeSingle();

  if (domainError) throw domainError;
  if (!domainRow) return null;

  const { data: termRow, error: termError } = await supabase
    .from("terms")
    .select("*")
    .eq("domain_id", domainRow.id)
    .eq("slug", termSlug)
    .maybeSingle();

  if (termError) throw termError;
  if (!termRow) return null;

  const { data: domainTerms, error: termsError } = await supabase
    .from("terms")
    .select("id, slug")
    .eq("domain_id", domainRow.id);
  if (termsError) throw termsError;

  const relatedTermSlugsById = new Map(
    (domainTerms ?? [])
      .filter((row): row is { id: string; slug: string } => Boolean(row.slug))
      .map((row) => [row.id, row.slug]),
  );

  const { data: relationshipRows, error: relationshipError } = await supabase
    .from("term_relationships")
    .select(
      "id, relationship_type, description, source_term_id, target_term_id, source:terms!term_relationships_source_term_id_fkey(term), target:terms!term_relationships_target_term_id_fkey(term)",
    )
    .or(`source_term_id.eq.${termRow.id},target_term_id.eq.${termRow.id}`);
  if (relationshipError) throw relationshipError;

  const relationshipLinks: TermRelationshipLink[] = (relationshipRows ?? []).map((row) => ({
    id: row.id,
    relationship_type: row.relationship_type,
    description: row.description,
    source_term_id: row.source_term_id,
    target_term_id: row.target_term_id,
    source_term_name: row.source?.term ?? "",
    target_term_name: row.target?.term ?? "",
  }));

  const [term] = attachRelationshipsToTerms([mapTerm(termRow)], relationshipLinks);

  return {
    domain: mapPublicDomain(domainRow),
    term: { ...term, slug: termRow.slug!, updatedAt: termRow.updated_at },
    relatedTermSlugsById,
  };
});
