import type { CollectionKind } from "@/lib/terms/kinds";
import type { TermCard } from "@/lib/terms/term-card";
import type { QuizTerm } from "./types";

export function toQuizTerm(card: TermCard, kind: CollectionKind): QuizTerm {
  return {
    id: card.id,
    term: card.term,
    definition: card.definition,
    example: card.example,
    antiExample: card.antiExample,
    category: card.category,
    kind,
    language: card.collectionLanguage,
    recognition: card.recognition,
    collectionId: card.collectionId,
    collectionName: card.collectionName,
  };
}
