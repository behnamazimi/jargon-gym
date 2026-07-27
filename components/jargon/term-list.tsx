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
      <div className="shadow-surface rounded-2xl bg-base-100 px-6 py-12 text-center">
        <p className="text-sm text-base-content/60">No terms match your filters.</p>
        <p className="mt-1 text-xs text-base-content/60">
          Clear your search or category filters, or turn off &ldquo;Hide terms I know&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
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
