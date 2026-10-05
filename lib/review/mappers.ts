import type { TermCard } from "@/lib/terms/term-card";
import type { ReviewTerm } from "./types";

export function toReviewTerm(card: TermCard): ReviewTerm {
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
    note: card.note ?? undefined,
    domainId: card.domainId,
    domainName: card.domainName,
    domainLanguage: card.domainLanguage,
    isNewToUser: card.isNewToUser,
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
