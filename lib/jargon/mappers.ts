import type { Database } from "@/lib/supabase/database.types";
import type { Domain, DomainSource, Term, TermRelationship } from "./types";

type DomainRow = Database["public"]["Tables"]["domains"]["Row"];
type TermRow = Database["public"]["Tables"]["terms"]["Row"];
type TermRelationshipRow = Database["public"]["Tables"]["term_relationships"]["Row"];
type TermRelationshipLinkRow = Pick<
  TermRelationshipRow,
  "id" | "relationship_type" | "description" | "source_term_id" | "target_term_id"
>;

type MapDomainOptions = {
  source: DomainSource;
  isActiveForReview: boolean;
  termCount?: number;
  knownCount?: number;
};

export function mapDomain(
  row: Pick<DomainRow, "id" | "name" | "icon_url" | "visibility" | "description">,
  options: MapDomainOptions,
): Domain {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon_url ?? "",
    description: row.description ?? "",
    visibility: row.visibility,
    source: options.source,
    isActiveForReview: options.isActiveForReview,
    termCount: options.termCount ?? 0,
    knownCount: options.knownCount ?? 0,
  };
}

export function mapTerm(row: TermRow): Term {
  return {
    id: row.id,
    term: row.term,
    category: row.category,
    definition: row.definition,
    example: row.example ?? "",
    discussion: row.discussion ?? "",
    controversy: row.controversy ?? undefined,
    relationships: [],
  };
}

export function attachRelationshipsToTerms(
  terms: Term[],
  relationshipRows: TermRelationshipLinkRow[],
): Term[] {
  const termNameById = new Map(terms.map((term) => [term.id, term.term]));
  const relationshipsByTermId = new Map<string, TermRelationship[]>();

  for (const row of relationshipRows) {
    const sourceName = termNameById.get(row.source_term_id);
    const targetName = termNameById.get(row.target_term_id);
    if (!sourceName || !targetName) continue;

    const outgoing: TermRelationship = {
      id: row.id,
      relationshipType: row.relationship_type,
      description: row.description,
      direction: "outgoing",
      relatedTermId: row.target_term_id,
      relatedTermName: targetName,
    };

    const incoming: TermRelationship = {
      id: row.id,
      relationshipType: row.relationship_type,
      description: row.description,
      direction: "incoming",
      relatedTermId: row.source_term_id,
      relatedTermName: sourceName,
    };

    const sourceRelationships = relationshipsByTermId.get(row.source_term_id) ?? [];
    sourceRelationships.push(outgoing);
    relationshipsByTermId.set(row.source_term_id, sourceRelationships);

    const targetRelationships = relationshipsByTermId.get(row.target_term_id) ?? [];
    targetRelationships.push(incoming);
    relationshipsByTermId.set(row.target_term_id, targetRelationships);
  }

  return terms.map((term) => ({
    ...term,
    relationships: relationshipsByTermId.get(term.id) ?? [],
  }));
}
