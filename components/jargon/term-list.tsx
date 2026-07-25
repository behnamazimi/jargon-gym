import type { Term } from "@/lib/jargon/types";
import { TermCard } from "./term-card";

type TermListProps = {
  terms: Term[];
  knownTerms: Set<string>;
  openTerms: Set<string>;
  onToggleOpen: (term: string) => void;
  onToggleKnown: (term: string) => void;
};

export function TermList({
  terms,
  knownTerms,
  openTerms,
  onToggleOpen,
  onToggleKnown,
}: TermListProps) {
  if (terms.length === 0) {
    return (
      <p className="py-10 text-center text-[13.5px] text-muted">No terms match your filters.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {terms.map((term) => (
        <TermCard
          key={term.term}
          term={term}
          known={knownTerms.has(term.term)}
          open={openTerms.has(term.term)}
          onToggleOpen={() => onToggleOpen(term.term)}
          onToggleKnown={() => onToggleKnown(term.term)}
        />
      ))}
    </div>
  );
}
