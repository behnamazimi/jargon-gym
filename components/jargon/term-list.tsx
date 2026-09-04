import type { Term } from "@/lib/jargon/types";
import { TermCard } from "./term-card";

type TermListProps = {
  terms: Term[];
  knownTerms: Set<string>;
  openTerms: Set<string>;
  isOwner: boolean;
  domainId: string;
  domainTerms: Term[];
  narrationAccess: boolean;
  onToggleOpen: (termId: string) => void;
};

export function TermList({
  terms,
  knownTerms,
  openTerms,
  isOwner,
  domainId,
  domainTerms,
  narrationAccess,
  onToggleOpen,
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
        <div key={term.id} className="content-visibility-auto [contain-intrinsic-size:auto_4.5rem]">
          <TermCard
            term={term}
            known={knownTerms.has(term.id)}
            open={openTerms.has(term.id)}
            isOwner={isOwner}
            domainId={domainId}
            domainTerms={domainTerms}
            narrationAccess={narrationAccess}
            onToggleOpen={() => onToggleOpen(term.id)}
          />
        </div>
      ))}
    </div>
  );
}
