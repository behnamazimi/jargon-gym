import type { Database } from "@/lib/supabase/database.types";
import type { Domain, DomainSource, Term, TermRelationship, TermRelationshipLink } from "./types";

type DomainRow = Database["public"]["Tables"]["domains"]["Row"];
type TermRow = Database["public"]["Tables"]["terms"]["Row"];

type MapDomainOptions = {
  source: DomainSource;
  isActiveForReview: boolean;
  termCount?: number;
  knownCount?: number;
  termsLearnedCount?: number;
};

export function mapDomain(
  row: Pick<DomainRow, "id" | "name" | "visibility" | "description">,
  options: MapDomainOptions,
): Domain {
  return {
    id: row.id,
    name: row.name,
    icon: "",
    description: row.description ?? "",
    visibility: row.visibility,
    source: options.source,
    isActiveForReview: options.isActiveForReview,
    termCount: options.termCount ?? 0,
    knownCount: options.knownCount ?? 0,
    termsLearnedCount: options.termsLearnedCount ?? 0,
  };
}

export function mapTerm(row: TermRow): Term {
  return {
    id: row.id,
    term: row.term,
    category: row.category,
    definition: row.definition,
    example: row.example ?? "",
    mentalModel: row.mental_model ?? undefined,
    discussion: row.discussion ?? "",
    antiExample: row.anti_example ?? undefined,
    controversy: row.controversy ?? undefined,
    relationships: [],
  };
}

export function attachRelationshipsToTerms(
  terms: Term[],
  relationshipRows: TermRelationshipLink[],
): Term[] {
  const termIds = new Set(terms.map((term) => term.id));
  const relationshipsByTermId = new Map<string, TermRelationship[]>();

  for (const row of relationshipRows) {
    const outgoing: TermRelationship = {
      id: row.id,
      relationshipType: row.relationship_type,
      description: row.description,
      direction: "outgoing",
      relatedTermId: row.target_term_id,
      relatedTermName: row.target_term_name,
    };

    const incoming: TermRelationship = {
      id: row.id,
      relationshipType: row.relationship_type,
      description: row.description,
      direction: "incoming",
      relatedTermId: row.source_term_id,
      relatedTermName: row.source_term_name,
    };

    if (termIds.has(row.source_term_id)) {
      const sourceRelationships = relationshipsByTermId.get(row.source_term_id) ?? [];
      sourceRelationships.push(outgoing);
      relationshipsByTermId.set(row.source_term_id, sourceRelationships);
    }

    if (termIds.has(row.target_term_id)) {
      const targetRelationships = relationshipsByTermId.get(row.target_term_id) ?? [];
      targetRelationships.push(incoming);
      relationshipsByTermId.set(row.target_term_id, targetRelationships);
    }
  }

  return terms.map((term) => ({
    ...term,
    relationships: relationshipsByTermId.get(term.id) ?? [],
  }));
}
