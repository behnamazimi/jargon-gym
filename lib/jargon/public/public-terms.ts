import { createPublicClient } from "@/lib/supabase/public";
import { attachRelationshipsToTerms, mapTerm } from "@/lib/jargon/mappers";
import type { TermRelationshipLink } from "@/lib/jargon/types";

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
};

export type PublicDomainSummary = PublicDomain & { termCount: number };

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
  category: string;
  definition: string;
};

export type PublicDomainPage = {
  domain: PublicDomain;
  terms: PublicTermSummary[];
};

export async function getPublicDomainPage(domainSlug: string): Promise<PublicDomainPage | null> {
  const supabase = createPublicClient();

  const { data: domainRow, error: domainError } = await supabase
    .from("domains")
    .select("id, slug, name, description, updated_at")
    .eq("slug", domainSlug)
    .eq("is_public", true)
    .maybeSingle();

  if (domainError) throw domainError;
  if (!domainRow) return null;

  const { data: termRows, error: termsError } = await supabase
    .from("terms")
    .select("slug, term, category, definition")
    .eq("domain_id", domainRow.id)
    .not("slug", "is", null)
    .order("term");
  if (termsError) throw termsError;

  return {
    domain: {
      id: domainRow.id,
      slug: domainRow.slug!,
      name: domainRow.name,
      description: domainRow.description ?? "",
      updatedAt: domainRow.updated_at,
    },
    terms: (termRows ?? []).map((row) => ({
      slug: row.slug!,
      term: row.term,
      category: row.category,
      definition: row.definition,
    })),
  };
}

export type PublicTermPage = {
  domain: PublicDomain;
  term: ReturnType<typeof mapTerm> & { slug: string; updatedAt: string };
  relatedTermSlugsById: Map<string, string>;
};

export async function getPublicTermPage(
  domainSlug: string,
  termSlug: string,
): Promise<PublicTermPage | null> {
  const supabase = createPublicClient();

  const { data: domainRow, error: domainError } = await supabase
    .from("domains")
    .select("id, slug, name, description, updated_at")
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
    domain: {
      id: domainRow.id,
      slug: domainRow.slug!,
      name: domainRow.name,
      description: domainRow.description ?? "",
      updatedAt: domainRow.updated_at,
    },
    term: { ...term, slug: termRow.slug!, updatedAt: termRow.updated_at },
    relatedTermSlugsById,
  };
}
