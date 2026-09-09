"use client";

import { Check, CheckCircle2, ChevronRight, Undo2 } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import type { Term } from "@/lib/jargon/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TermNarrationPlayer } from "@/components/jargon/term-narration-player";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TermActionsMenu } from "./term-actions-menu";
import { TermBody } from "./term-body";

type TermCardProps = {
  term: Term;
  known: boolean;
  /** User-set "I already know this" override — separate from `known`
   *  (TRACE's earned label). Never conflated in the UI. */
  markedKnown: boolean;
  open: boolean;
  isOwner: boolean;
  domainId: string;
  domainTerms: Term[];
  narrationAccess: boolean;
  onToggleOpen: (termId: string) => void;
  onToggleMarkedKnown: (termId: string) => void;
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
        known
          ? "text-base-content/60 line-through decoration-primary/60 decoration-2"
          : "text-base-content",
      )}
    >
      {term.term}
      {known ? <KnownBadge /> : null}
      {markedKnown ? <MarkedKnownBadge /> : null}
    </span>
  );
}

type CardToolsProps = {
  term: Term;
  domainId: string;
  domainTerms: Term[];
  isOwner: boolean;
  narrationAccess: boolean;
};

function CardTools({ term, domainId, domainTerms, isOwner, narrationAccess }: CardToolsProps) {
  if (!narrationAccess && !isOwner) return null;
  return (
    <div className="flex shrink-0 items-center gap-1 pe-1">
      {narrationAccess ? <TermNarrationPlayer termId={term.id} /> : null}
      {isOwner ? (
        <TermActionsMenu term={term} domainId={domainId} domainTerms={domainTerms} />
      ) : null}
    </div>
  );
}

type MarkKnownButtonProps = {
  markedKnown: boolean;
  onPress: () => void;
};

function MarkKnownButton({ markedKnown, onPress }: MarkKnownButtonProps) {
  return (
    <Button size="sm" variant={markedKnown ? "outline" : "secondary"} onPress={onPress}>
      {markedKnown ? (
        <>
          <Undo2 className="size-4" aria-hidden strokeWidth={1.5} />
          Add to learning
        </>
      ) : (
        <>
          <CheckCircle2 className="size-4" aria-hidden strokeWidth={1.5} />
          Mark known
        </>
      )}
    </Button>
  );
}

export const TermCard = memo(function TermCard({
  term,
  known,
  markedKnown,
  open,
  isOwner,
  domainId,
  domainTerms,
  narrationAccess,
  onToggleOpen,
  onToggleMarkedKnown,
}: TermCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  return (
    <div ref={cardRef} className="scroll-mb-20">
      <Collapsible
        isExpanded={open}
        onExpandedChange={(expanded) => {
          if (expanded !== open) onToggleOpen(term.id);
        }}
        className={cn((known || markedKnown) && !open && "opacity-70")}
        data-term={term.term}
      >
        <article
          className={cn(
            "overflow-hidden rounded-xl bg-base-100",
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
                <span className="hidden text-xs text-base-content/50 sm:inline">
                  {term.category}
                </span>
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
            />
          </div>
          <CollapsibleContent>
            <TermBody term={term} className="px-4 pt-4" />
            <div className="px-4 pb-4 mt-4">
              <MarkKnownButton
                markedKnown={markedKnown}
                onPress={() => onToggleMarkedKnown(term.id)}
              />
            </div>
          </CollapsibleContent>
        </article>
      </Collapsible>
    </div>
  );
});
