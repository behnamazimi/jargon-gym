import type { TermCard } from "@/lib/jargon/term-card";
import type { QuizTerm } from "./types";

export function toQuizTerm(card: TermCard): QuizTerm {
  return {
    id: card.id,
    term: card.term,
    definition: card.definition,
    example: card.example,
    antiExample: card.antiExample,
    domainId: card.domainId,
    domainName: card.domainName,
  };
}
