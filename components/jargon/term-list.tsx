"use client";

import { useCallback, useState } from "react";
import type { DomainLanguage } from "@/lib/jargon/languages";
import type { LibraryTerm } from "@/lib/jargon/types";
import { EmptyTermsState } from "./empty-terms-state";
import { TermCard } from "./term-card";

/** Rows rendered up front (also on the server); more follow as the list
 *  scrolls, so a long collection doesn't render and hydrate every row. */
const ROWS_PER_STEP = 50;
const GROW_MARGIN = "800px 0px";

type TermListProps = {
  terms: LibraryTerm[];
  /** Changes whenever the filters do, which starts the rows over from the first step. */
  windowKey: string;
  knownTerms: Set<string>;
  markedKnownTerms: Set<string>;
  openTerms: ReadonlySet<string>;
  isOwner: boolean;
  language: DomainLanguage;
  /** Studyable terms in the collection, before filters. */
  totalCount: number;
  /** The owner has terms that are saved but not finished yet. */
  hasUnfinished: boolean;
  onAddTerm: () => void;
  onToggleOpen: (termId: string) => void;
  onToggleMarkedKnown: (termId: string) => Promise<boolean>;
  onEdit: (termId: string) => void;
  onDelete: (term: LibraryTerm) => void;
};

function EmptyMessage({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="shadow-surface rounded-box bg-base-100 px-6 py-12 text-center">
      <p className="text-sm text-base-content/70">{title}</p>
      {detail ? <p className="mt-1 text-xs text-base-content/70">{detail}</p> : null}
    </div>
  );
}

export function TermList({ windowKey, totalCount, hasUnfinished, ...props }: TermListProps) {
  if (totalCount === 0 && hasUnfinished) {
    return <EmptyMessage title="Nothing to study yet. Add a definition to start." />;
  }

  if (totalCount === 0) {
    return props.isOwner ? (
      <EmptyTermsState onAddTerm={props.onAddTerm} />
    ) : (
      <EmptyMessage title="No terms in this collection yet." />
    );
  }

  if (props.terms.length === 0) {
    return (
      <EmptyMessage
        title="No terms match your filters."
        detail="Clear your search or category filters, or turn off “Hide terms I know”."
      />
    );
  }

  return <TermRows windowKey={windowKey} {...props} />;
}

function TermRows({
  terms,
  knownTerms,
  markedKnownTerms,
  openTerms,
  isOwner,
  language,
  onToggleOpen,
  onToggleMarkedKnown,
  onEdit,
  onDelete,
  windowKey,
}: Omit<TermListProps, "totalCount" | "hasUnfinished" | "onAddTerm">) {
  // Back to the first rows whenever the filters change. Adjusted during
  // render rather than by remounting, so rows still on screen keep their state.
  const [rowWindow, setRowWindow] = useState({ key: windowKey, limit: ROWS_PER_STEP });
  if (rowWindow.key !== windowKey) setRowWindow({ key: windowKey, limit: ROWS_PER_STEP });
  const limit = rowWindow.key === windowKey ? rowWindow.limit : ROWS_PER_STEP;

  const watchEnd = useCallback((sentinel: HTMLDivElement | null) => {
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRowWindow((current) => ({ ...current, limit: current.limit + ROWS_PER_STEP }));
        }
      },
      { rootMargin: GROW_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="shadow-surface divide-y divide-base-300/60 overflow-hidden rounded-box bg-base-100">
      {terms.slice(0, limit).map((term) => (
        <div key={term.id} className="content-visibility-auto [contain-intrinsic-size:auto_4.5rem]">
          <TermCard
            term={term}
            known={knownTerms.has(term.id)}
            markedKnown={markedKnownTerms.has(term.id)}
            open={openTerms.has(term.id)}
            isOwner={isOwner}
            language={language}
            onToggleOpen={onToggleOpen}
            onToggleMarkedKnown={onToggleMarkedKnown}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ))}
      {/* Keyed by the limit so it is observed afresh after each step, even
          when it is still inside the margin. */}
      {limit < terms.length ? (
        <div key={limit} ref={watchEnd} aria-hidden className="h-px" />
      ) : null}
    </div>
  );
}
