"use client";

import { Check, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Term } from "@/lib/jargon/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  onToggleOpen: () => void;
};

export function TermCard({
  term,
  known,
  open,
  isOwner,
  domainId,
  domainTerms,
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
            <CollapsibleTrigger className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start justify-between gap-3 rounded-lg border-none bg-transparent p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
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
              <span className="inline-flex shrink-0 items-center gap-2 pt-0.5">
                <span className="text-xs text-base-content/50">{term.category}</span>
                <ChevronRight
                  className={cn("size-4 text-base-content/60", open && "rotate-90 text-primary")}
                  aria-hidden
                  strokeWidth={1.5}
                />
              </span>
            </CollapsibleTrigger>
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
