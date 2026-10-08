import type { Database } from "@/lib/supabase/database.types";
import type {
  Collection,
  CollectionSource,
  Term,
  TermRelationship,
  TermRelationshipLink,
  UnfinishedTerm,
} from "./types";

type CollectionRow = Database["public"]["Tables"]["collections"]["Row"];
type TermRow = Database["public"]["Tables"]["terms"]["Row"];

type MapCollectionOptions = {
  source: CollectionSource;
  isActiveForReview: boolean;
  termCount?: number;
  unfinishedCount?: number;
  knownCount?: number;
  termsLearnedCount?: number;
  markedKnownCount?: number;
  lovedByMe?: boolean;
  reportedByMe?: boolean;
};

export function mapCollection(
  row: Pick<CollectionRow, "id" | "name" | "visibility" | "description" | "language"> &
    Partial<Pick<CollectionRow, "is_builtin" | "love_count" | "share_block_reason">>,
  options: MapCollectionOptions,
): Collection {
  return {
    id: row.id,
    name: row.name,
    icon: "",
    description: row.description ?? "",
    visibility: row.visibility,
    language: row.language as Collection["language"],
    source: options.source,
    isActiveForReview: options.isActiveForReview,
    termCount: options.termCount ?? 0,
    unfinishedCount: options.unfinishedCount ?? 0,
    knownCount: options.knownCount ?? 0,
    termsLearnedCount: options.termsLearnedCount ?? 0,
    markedKnownCount: options.markedKnownCount ?? 0,
    isBuiltin: row.is_builtin ?? false,
    loveCount: row.love_count ?? 0,
    shareBlockedReason: row.share_block_reason ?? null,
    lovedByMe: options.lovedByMe ?? false,
    reportedByMe: options.reportedByMe ?? false,
  };
}

export function mapTerm(row: TermRow): Term {
  return {
    id: row.id,
    term: row.term,
    category: row.category,
    definition: row.definition ?? "",
    example: row.example ?? "",
    mentalModel: row.mental_model ?? undefined,
    discussion: row.discussion ?? "",
    antiExample: row.anti_example ?? undefined,
    controversy: row.controversy ?? undefined,
    note: row.note ?? undefined,
    relationships: [],
  };
}

function isUnfinishedRow(row: TermRow): boolean {
  return row.definition === null;
}

/** Splits a collection's rows into terms ready to study and terms still
 *  waiting for a definition. */
export function mapTermsByState(rows: TermRow[]): {
  terms: Term[];
  unfinishedTerms: UnfinishedTerm[];
} {
  const terms: Term[] = [];
  const unfinishedTerms: UnfinishedTerm[] = [];
  for (const row of rows) {
    if (isUnfinishedRow(row)) {
      unfinishedTerms.push({ ...mapTerm(row), definition: null });
    } else {
      terms.push(mapTerm(row));
    }
  }
  return { terms, unfinishedTerms };
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
