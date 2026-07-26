import type { Term } from "@/lib/jargon/types";
import { TermCard } from "./term-card";

type TermListProps = {
  terms: Term[];
  knownTerms: Set<string>;
  openTerms: Set<string>;
  isOwner: boolean;
  domainId: string;
  domainTerms: Term[];
  onToggleOpen: (termId: string) => void;
  onToggleKnown: (termId: string) => void;
};

export function TermList({
  terms,
  knownTerms,
  openTerms,
  isOwner,
  domainId,
  domainTerms,
  onToggleOpen,
  onToggleKnown,
}: TermListProps) {
  if (terms.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No terms match your filters.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {terms.map((term) => (
        <TermCard
          key={term.id}
          term={term}
          known={knownTerms.has(term.id)}
          open={openTerms.has(term.id)}
          isOwner={isOwner}
          domainId={domainId}
          domainTerms={domainTerms}
          onToggleOpen={() => onToggleOpen(term.id)}
          onToggleKnown={() => onToggleKnown(term.id)}
        />
      ))}
    </div>
  );
}
