import type { TermCard } from "@/lib/jargon/term-card";
import type { TermPoolStatus } from "@/lib/study";
import type { ReviewTerm } from "./types";

export function toReviewTerm(card: TermCard, originStatus: TermPoolStatus): ReviewTerm {
  return {
    id: card.id,
    term: card.term,
    category: card.category,
    definition: card.definition,
    example: card.example ?? "",
    mentalModel: card.mentalModel ?? undefined,
    discussion: card.discussion ?? "",
    antiExample: card.antiExample ?? undefined,
    controversy: card.controversy ?? undefined,
    domainName: card.domainName,
    originStatus,
    relationships: card.relationships.map((rel, index) => ({
      id: `${card.id}-${rel.direction}-${index}`,
      relationshipType: rel.relationshipType,
      description: rel.description,
      direction: rel.direction,
      relatedTermId: "",
      relatedTermName: rel.relatedTermName,
    })),
  };
}
