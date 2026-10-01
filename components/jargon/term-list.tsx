import type { DomainLanguage } from "@/lib/jargon/languages";
import type { Term } from "@/lib/jargon/types";
import { EmptyTermsState } from "./empty-terms-state";
import { TermCard } from "./term-card";

type TermListProps = {
  terms: Term[];
  knownTerms: Set<string>;
  markedKnownTerms: Set<string>;
  openTerms: Set<string>;
  isOwner: boolean;
  domainId: string;
  language: DomainLanguage;
  domainTerms: Term[];
  /** The owner has terms that are saved but not finished yet. */
  hasUnfinished: boolean;
  onAddTerm: () => void;
  narrationAccess: boolean;
  onToggleOpen: (termId: string) => void;
  onToggleMarkedKnown: (termId: string) => Promise<boolean>;
  onTermRemoved: (termId: string) => void;
  onTermRemoveFailed: (term: Term, index: number, domainId: string) => void;
};

export function TermList({
  terms,
  knownTerms,
  markedKnownTerms,
  openTerms,
  isOwner,
  domainId,
  language,
  domainTerms,
  hasUnfinished,
  onAddTerm,
  narrationAccess,
  onToggleOpen,
  onToggleMarkedKnown,
  onTermRemoved,
  onTermRemoveFailed,
}: TermListProps) {
  if (domainTerms.length === 0 && hasUnfinished) {
    return (
      <div className="shadow-surface rounded-2xl bg-base-100 px-6 py-12 text-center">
        <p className="text-sm text-base-content/60">
          Nothing to study yet. Add a definition to start.
        </p>
      </div>
    );
  }

  if (domainTerms.length === 0) {
    return isOwner ? (
      <EmptyTermsState onAddTerm={onAddTerm} />
    ) : (
      <div className="shadow-surface rounded-2xl bg-base-100 px-6 py-12 text-center">
        <p className="text-sm text-base-content/60">No terms in this collection yet.</p>
      </div>
    );
  }

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
            markedKnown={markedKnownTerms.has(term.id)}
            open={openTerms.has(term.id)}
            isOwner={isOwner}
            domainId={domainId}
            language={language}
            domainTerms={domainTerms}
            narrationAccess={narrationAccess}
            onToggleOpen={onToggleOpen}
            onToggleMarkedKnown={onToggleMarkedKnown}
            onTermRemoved={onTermRemoved}
            onTermRemoveFailed={onTermRemoveFailed}
          />
        </div>
      ))}
    </div>
  );
}
