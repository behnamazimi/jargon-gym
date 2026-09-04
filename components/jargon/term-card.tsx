"use client";

import { Check, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Term } from "@/lib/jargon/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TermNarrationPlayer } from "@/components/jargon/term-narration-player";
import { cn } from "@/lib/utils";
import { TermActionsMenu } from "./term-actions-menu";
import { TermBody } from "./term-body";

type TermCardProps = {
  term: Term;
  known: boolean;
  open: boolean;
  isOwner: boolean;
  domainId: string;
  domainTerms: Term[];
  narrationAccess: boolean;
  onToggleOpen: () => void;
};

export function TermCard({
  term,
  known,
  open,
  isOwner,
  domainId,
  domainTerms,
  narrationAccess,
  onToggleOpen,
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
          if (expanded !== open) onToggleOpen();
        }}
        className={cn(known && !open && "opacity-70")}
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
            {/* A CollapsibleTrigger renders a real <button>, so the narration
                button (also a button) can't nest inside it. It's narrowed to
                just the term name — still the primary, large toggle target —
                and the narration button sits beside it as a true sibling. */}
            <div className="flex min-h-11 min-w-0 flex-1 items-start justify-between gap-3 p-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <CollapsibleTrigger className="min-w-0 cursor-pointer rounded-md border-none bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <span
                    className={cn(
                      "font-heading min-w-0 text-base font-semibold tracking-tight text-pretty",
                      known
                        ? "text-base-content/60 line-through decoration-primary/60 decoration-2"
                        : "text-base-content",
                    )}
                  >
                    {term.term}
                    {known ? (
                      <span
                        className="inline-flex shrink-0 size-5 items-center justify-center rounded-full bg-primary/15 text-primary ml-2"
                        title="Known"
                      >
                        <Check className="size-3" strokeWidth={2.5} />
                      </span>
                    ) : null}
                  </span>
                </CollapsibleTrigger>
                {narrationAccess ? <TermNarrationPlayer termId={term.id} /> : null}
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 pt-0.5">
                <span className="text-xs text-base-content/50">{term.category}</span>
                <ChevronRight
                  className={cn("size-4 text-base-content/60", open && "rotate-90 text-primary")}
                  aria-hidden
                  strokeWidth={1.5}
                />
              </span>
            </div>
            {isOwner ? (
              <div className="flex shrink-0 items-center pe-1">
                <TermActionsMenu term={term} domainId={domainId} domainTerms={domainTerms} />
              </div>
            ) : null}
          </div>
          <CollapsibleContent>
            <TermBody term={term} className="px-4 pt-4 pb-5" />
          </CollapsibleContent>
        </article>
      </Collapsible>
    </div>
  );
}
