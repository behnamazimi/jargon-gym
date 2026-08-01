import type { TermCard } from "@/lib/jargon/term-card";
import type { ReviewTerm } from "./types";

export function toReviewTerm(card: TermCard): ReviewTerm {
  return {
    id: card.id,
    term: card.term,
    category: card.category,
    definition: card.definition,
    example: card.example ?? "",
    discussion: card.discussion ?? "",
    controversy: card.controversy ?? undefined,
    domainName: card.domainName,
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
