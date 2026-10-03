import type { Domain, Term } from "@/lib/terms/types";
import type { ReviewTerm } from "@/lib/review/types";

type DeckExclusions = {
  knownIds: ReadonlySet<string>;
  markedKnownIds: ReadonlySet<string>;
  notYetIds: ReadonlySet<string>;
};

/** Terms still worth sorting, in Library order: anything the user hasn't
 *  marked known, TRACE doesn't already call known, and wasn't put aside
 *  as "Not yet". */
export function buildTriageDeck(terms: Term[], exclusions: DeckExclusions): Term[] {
  const { knownIds, markedKnownIds, notYetIds } = exclusions;
  return terms.filter(
    (term) => !knownIds.has(term.id) && !markedKnownIds.has(term.id) && !notYetIds.has(term.id),
  );
}

/** Shapes a Library term for the Review flashcard. `isNewToUser` stays
 *  unset so the card doesn't repeat Triage's own "I know this" prompt. */
export function toTriageTerm(term: Term, domain: Pick<Domain, "name" | "language">): ReviewTerm {
  return { ...term, domainName: domain.name, domainLanguage: domain.language };
}
