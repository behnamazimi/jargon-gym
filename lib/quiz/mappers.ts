import type { TermCard } from "@/lib/jargon/term-card";
import type { PickReason, Strength } from "@/lib/smart-queue";
import type { QuizTerm } from "./types";

export function toQuizTerm(
  card: TermCard,
  pickReasons?: PickReason[],
  strength?: Strength,
): QuizTerm {
  return {
    id: card.id,
    term: card.term,
    definition: card.definition,
    example: card.example,
    domainName: card.domainName,
    pickReasons,
    strength,
  };
}
