"use client";

import { Check, ChevronRight } from "lucide-react";
import { memo, useCallback, useContext, useRef } from "react";
import type { DomainLanguage } from "@/lib/terms/languages";
import {
  prefetchTermDetails,
  retryTermDetails,
  TermDetailsScope,
  useTermDetails,
} from "@/lib/library/details-store";
import { observeRowForDetails } from "@/lib/library/row-prefetch";
import type { LibraryTerm } from "@/lib/terms/types";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SkeletonBar } from "@/components/page-skeleton";
import { NarrationButton } from "@/components/library/narration-access";
import { cn } from "@/lib/utils";
import {
  MarkKnownButton,
  QuickMarkKnownButton,
  RowSwipeLayer,
  useQuickToggleMarkedKnown,
} from "./mark-known-controls";
import { TermActionsMenu } from "./term-actions-menu";
import { TermBody } from "./term-body";
import { useRowSwipe } from "./use-row-swipe";

type TermCardProps = {
  term: LibraryTerm;
  known: boolean;
  /** User-set "I already know this" override — separate from `known`
   *  (TRACE's earned label). Never conflated in the UI. */
  markedKnown: boolean;
  open: boolean;
  isOwner: boolean;
  language: DomainLanguage;
  onToggleOpen: (termId: string) => void;
  onToggleMarkedKnown: (termId: string) => Promise<boolean>;
  onEdit: (termId: string) => void;
  onDelete: (term: LibraryTerm) => void;
};

function KnownBadge() {
  return (
    <span
      className="inline-flex shrink-0 size-5 items-center justify-center rounded-full bg-primary/15 text-primary-text ml-2"
      title="Mastered"
      aria-label="Mastered"
    >
      <Check className="size-3" strokeWidth={2.5} />
    </span>
  );
}

function MarkedKnownBadge() {
  return (
    <span
      className="inline-flex shrink-0 size-5 items-center justify-center rounded-full bg-info/15 text-info-text ml-2"
      title="Marked known"
      aria-label="Marked known"
    >
      <Check className="size-3" strokeWidth={2.5} />
    </span>
  );
}

type CardTitleProps = {
  term: LibraryTerm;
  known: boolean;
  markedKnown: boolean;
};

function CardTitle({ term, known, markedKnown }: CardTitleProps) {
  return (
    <span
      className={cn(
        "font-heading min-w-0 text-lg font-medium text-pretty",
        known || markedKnown
          ? "text-base-content/70 decoration-primary/60 decoration-2"
          : "text-base-content",
      )}
    >
      {term.term}
      {known ? <KnownBadge /> : null}
      {markedKnown && !known ? <MarkedKnownBadge /> : null}
    </span>
  );
}

/** The open card's details, loaded on demand (usually already prefetched
 *  while the row scrolled into view). */
function CardBody({
  termId,
  language,
  markedKnown,
  onToggleMarkedKnown,
}: {
  termId: string;
  language: DomainLanguage;
  markedKnown: boolean;
  onToggleMarkedKnown: (termId: string) => Promise<boolean>;
}) {
  const scope = useContext(TermDetailsScope);
  const details = useTermDetails(termId);

  if (details === "failed") {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <p className="m-0 text-sm text-base-content/70">Couldn&apos;t load this term.</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onPress={() => retryTermDetails(scope, termId)}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!details) {
    return (
      <div
        ref={() => prefetchTermDetails(scope, [termId])}
        className="space-y-2 px-4 py-4"
        aria-busy="true"
        aria-label="Loading term"
      >
        <SkeletonBar className="h-4 w-full" />
        <SkeletonBar className="h-4 w-2/3" />
      </div>
    );
  }

  return (
    <>
      <TermBody term={details} language={language} className="px-4 pt-4" />
      <div className="px-4 pb-4 mt-4">
        <MarkKnownButton
          markedKnown={markedKnown}
          onPress={() => void onToggleMarkedKnown(termId)}
        />
      </div>
    </>
  );
}

export const TermCard = memo(function TermCard({
  term,
  known,
  markedKnown,
  open,
  isOwner,
  language,
  onToggleOpen,
  onToggleMarkedKnown,
  onEdit,
  onDelete,
}: TermCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const scope = useContext(TermDetailsScope);

  const watchRow = useCallback(
    (element: HTMLDivElement | null) => {
      cardRef.current = element;
      return element ? observeRowForDetails(element, term.id, scope) : undefined;
    },
    [term.id, scope],
  );

  // The body mounts when the card opens, so this runs once per opening.
  const revealOpenedCard = useCallback((body: HTMLDivElement | null) => {
    if (body) cardRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  const quickToggleMarkedKnown = useQuickToggleMarkedKnown(term, markedKnown, onToggleMarkedKnown);
  const swipe = useRowSwipe({ enabled: !open, onCommit: quickToggleMarkedKnown });

  return (
    <div
      ref={watchRow}
      className={cn("relative scroll-mb-20", !open && "touch-pan-y")}
      {...swipe.handlers}
    >
      <RowSwipeLayer ref={swipe.layerRef} markedKnown={markedKnown} />
      <Collapsible
        isExpanded={open}
        onExpandedChange={(expanded) => {
          // The lift at the end of a row swipe also reads as a press.
          if (swipe.justSwipedRef.current) return;
          if (expanded !== open) onToggleOpen(term.id);
        }}
        className={cn((known || markedKnown) && !open && "opacity-70")}
        data-term={term.term}
      >
        <article
          ref={swipe.rowRef}
          data-tour="library-term"
          className={cn("group relative overflow-hidden bg-base-100", open && "bg-primary/[0.04]")}
        >
          <div
            className={cn(
              "flex items-stretch gap-2 px-2 py-1",
              open && "border-b border-base-300/60 bg-primary/[0.04]",
            )}
          >
            <CollapsibleTrigger className="flex min-h-14 min-w-0 flex-1 cursor-pointer transition-transform active:scale-[0.99] motion-reduce:transition-none items-center justify-between gap-3 rounded-field border-none bg-transparent p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <CardTitle term={term} known={known} markedKnown={markedKnown} />
              <span className="inline-flex shrink-0 items-center gap-2">
                {term.category ? (
                  <span className="hidden text-xs text-base-content/70 sm:inline">
                    {term.category}
                  </span>
                ) : null}
                <ChevronRight
                  className={cn(
                    "size-4 text-base-content/70",
                    open && "rotate-90 text-primary-text",
                  )}
                  aria-hidden
                  strokeWidth={1.5}
                />
              </span>
            </CollapsibleTrigger>
            <div className="flex shrink-0 items-center gap-1 pe-1">
              <QuickMarkKnownButton markedKnown={markedKnown} onPress={quickToggleMarkedKnown} />
              <NarrationButton termId={term.id} />
              {isOwner ? (
                <TermActionsMenu
                  termName={term.term}
                  onEdit={() => onEdit(term.id)}
                  onDelete={() => onDelete(term)}
                />
              ) : null}
            </div>
          </div>
          <CollapsibleContent>
            {open ? (
              <div ref={revealOpenedCard}>
                <CardBody
                  termId={term.id}
                  language={language}
                  markedKnown={markedKnown}
                  onToggleMarkedKnown={onToggleMarkedKnown}
                />
              </div>
            ) : null}
          </CollapsibleContent>
        </article>
      </Collapsible>
    </div>
  );
});
