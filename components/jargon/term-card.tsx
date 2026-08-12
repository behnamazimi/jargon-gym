"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Term } from "@/lib/jargon/types";
import type { Strength } from "@/lib/smart-queue";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { StrengthBadge } from "./strength-badge";
import { TermActionsMenu } from "./term-actions-menu";
import { TermBody } from "./term-body";

type TermCardProps = {
  term: Term;
  known: boolean;
  strength?: Strength;
  showStrength?: boolean;
  open: boolean;
  isOwner: boolean;
  domainId: string;
  domainTerms: Term[];
  onToggleOpen: () => void;
  onToggleKnown: () => void;
};

export function TermCard({
  term,
  known,
  strength,
  showStrength = false,
  open,
  isOwner,
  domainId,
  domainTerms,
  onToggleOpen,
  onToggleKnown,
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
            <div className="flex shrink-0 items-center ps-1">
              <Checkbox
                isSelected={known}
                onChange={onToggleKnown}
                aria-label={known ? "Mark as not known" : "Mark as known"}
                className={cn(
                  "size-6 rounded-full border-2",
                  !known && "border-base-content/30 bg-base-100",
                )}
              />
            </div>
            <CollapsibleTrigger className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-lg border-none bg-transparent p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span
                className={cn(
                  "font-heading text-base font-semibold tracking-tight",
                  known
                    ? "text-base-content/60 line-through decoration-primary/60 decoration-2"
                    : "text-base-content",
                )}
              >
                {term.term}
              </span>
              <span className="inline-flex shrink-0 items-center gap-2">
                {showStrength ? <StrengthBadge strength={strength} /> : null}
                <Badge variant="outline" className="badge-sm font-normal">
                  {term.category}
                </Badge>
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
