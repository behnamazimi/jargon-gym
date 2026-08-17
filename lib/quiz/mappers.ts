import type { TermCard } from "@/lib/jargon/term-card";
import type { OverallStrength, PickReason } from "@/lib/smart-queue";
import type { QuizTerm } from "./types";

export function toQuizTerm(
  card: TermCard,
  pickReasons?: PickReason[],
  strength?: OverallStrength,
): QuizTerm {
  return {
    id: card.id,
    term: card.term,
    definition: card.definition,
    example: card.example,
    domainId: card.domainId,
    domainName: card.domainName,
    pickReasons,
    strength,
  };
}
