"use client";

import { Check, ChevronRight } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import type { DomainLanguage } from "@/lib/jargon/languages";
import type { Term } from "@/lib/jargon/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TermNarrationPlayer } from "@/components/jargon/term-narration-player";
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
  term: Term;
  known: boolean;
  /** User-set "I already know this" override — separate from `known`
   *  (TRACE's earned label). Never conflated in the UI. */
  markedKnown: boolean;
  open: boolean;
  isOwner: boolean;
  domainId: string;
  language: DomainLanguage;
  domainTerms: Term[];
  narrationAccess: boolean;
  onToggleOpen: (termId: string) => void;
  onToggleMarkedKnown: (termId: string) => Promise<boolean>;
  onTermRemoved: (termId: string) => void;
  onTermRemoveFailed: (term: Term, index: number, domainId: string) => void;
};

function KnownBadge() {
  return (
    <span
      className="inline-flex shrink-0 size-5 items-center justify-center rounded-full bg-primary/15 text-primary ml-2"
      title="Known"
    >
      <Check className="size-3" strokeWidth={2.5} />
    </span>
  );
}

function MarkedKnownBadge() {
  return (
    <span
      className="inline-flex shrink-0 size-5 items-center justify-center rounded-full bg-info/15 text-info ml-2"
      title="Marked known"
      aria-label="Marked known"
    >
      <Check className="size-3" strokeWidth={2.5} />
    </span>
  );
}

type CardTitleProps = {
  term: Term;
  known: boolean;
  markedKnown: boolean;
};

function CardTitle({ term, known, markedKnown }: CardTitleProps) {
  return (
    <span
      className={cn(
        "font-heading min-w-0 text-base font-semibold tracking-tight text-pretty",
        known || markedKnown
          ? "text-base-content/60 decoration-primary/60 decoration-2"
          : "text-base-content",
      )}
    >
      {term.term}
      {known ? <KnownBadge /> : null}
      {markedKnown && !known ? <MarkedKnownBadge /> : null}
    </span>
  );
}

type CardToolsProps = {
  term: Term;
  domainId: string;
  domainTerms: Term[];
  isOwner: boolean;
  narrationAccess: boolean;
  markedKnown: boolean;
  onQuickToggleMarkedKnown: () => void;
  onTermRemoved: (termId: string) => void;
  onTermRemoveFailed: (term: Term, index: number, domainId: string) => void;
};

function CardTools({
  term,
  domainId,
  domainTerms,
  isOwner,
  narrationAccess,
  markedKnown,
  onQuickToggleMarkedKnown,
  onTermRemoved,
  onTermRemoveFailed,
}: CardToolsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1 pe-1">
      <QuickMarkKnownButton markedKnown={markedKnown} onPress={onQuickToggleMarkedKnown} />
      {narrationAccess ? <TermNarrationPlayer termId={term.id} /> : null}
      {isOwner ? (
        <TermActionsMenu
          term={term}
          domainId={domainId}
          domainTerms={domainTerms}
          onTermRemoved={onTermRemoved}
          onTermRemoveFailed={onTermRemoveFailed}
        />
      ) : null}
    </div>
  );
}

export const TermCard = memo(function TermCard({
  term,
  known,
  markedKnown,
  open,
  isOwner,
  domainId,
  language,
  domainTerms,
  narrationAccess,
  onToggleOpen,
  onToggleMarkedKnown,
  onTermRemoved,
  onTermRemoveFailed,
}: TermCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  const quickToggleMarkedKnown = useQuickToggleMarkedKnown(term, markedKnown, onToggleMarkedKnown);
  const swipe = useRowSwipe({ enabled: !open, onCommit: quickToggleMarkedKnown });

  return (
    <div
      ref={cardRef}
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
          className={cn(
            "group relative overflow-hidden rounded-xl bg-base-100",
            open ? "shadow-surface-raised" : "shadow-surface",
          )}
        >
          <div
            className={cn(
              "flex items-stretch gap-2 px-2 py-1",
              open && "border-b border-base-300/60 bg-primary/[0.04]",
            )}
          >
            <CollapsibleTrigger className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-lg border-none bg-transparent p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <CardTitle term={term} known={known} markedKnown={markedKnown} />
              <span className="inline-flex shrink-0 items-center gap-2">
                {term.category ? (
                  <span className="hidden text-xs text-base-content/50 sm:inline">
                    {term.category}
                  </span>
                ) : null}
                <ChevronRight
                  className={cn("size-4 text-base-content/60", open && "rotate-90 text-primary")}
                  aria-hidden
                  strokeWidth={1.5}
                />
              </span>
            </CollapsibleTrigger>
            <CardTools
              term={term}
              domainId={domainId}
              domainTerms={domainTerms}
              isOwner={isOwner}
              narrationAccess={narrationAccess}
              markedKnown={markedKnown}
              onQuickToggleMarkedKnown={quickToggleMarkedKnown}
              onTermRemoved={onTermRemoved}
              onTermRemoveFailed={onTermRemoveFailed}
            />
          </div>
          <CollapsibleContent>
            <TermBody term={term} language={language} className="px-4 pt-4" />
            <div className="px-4 pb-4 mt-4">
              <MarkKnownButton
                markedKnown={markedKnown}
                onPress={() => void onToggleMarkedKnown(term.id)}
              />
            </div>
          </CollapsibleContent>
        </article>
      </Collapsible>
    </div>
  );
});
