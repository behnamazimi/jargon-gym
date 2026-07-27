"use client";

import { AlertTriangle, ChevronRight, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Term } from "@/lib/jargon/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { TermActionsMenu } from "./term-actions-menu";

type TermCardProps = {
  term: Term;
  known: boolean;
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
  open,
  isOwner,
  domainId,
  domainTerms,
  onToggleOpen,
  onToggleKnown,
}: TermCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(term.term + " definition")}`;

  useEffect(() => {
    if (!open) return;
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
        <Card
          className={cn(
            "gap-0 p-0 overflow-hidden transition-all duration-200",
            open
              ? "ring-primary/30 shadow-md"
              : "ring-base-content/5 hover:shadow-sm hover:ring-base-content/10",
          )}
        >
          <div
            className={cn(
              "flex items-stretch gap-3 px-3 py-1 transition-colors",
              open && "border-b border-primary/15 bg-primary/5",
            )}
          >
            <div className="flex shrink-0 items-center">
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
            <CollapsibleTrigger className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-md border-none bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
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
                <Badge variant="outline" className="font-normal text-secondary">
                  {term.category}
                </Badge>
                <ChevronRight
                  className={cn(
                    "size-4 text-base-content/60 transition-transform duration-200",
                    open && "rotate-90 text-primary",
                  )}
                  aria-hidden
                />
              </span>
            </CollapsibleTrigger>
            {isOwner ? (
              <div className="flex shrink-0 items-center">
                <TermActionsMenu term={term} domainId={domainId} domainTerms={domainTerms} />
              </div>
            ) : null}
          </div>
          <CollapsibleContent>
            <div className="px-4 pt-4 pb-5">
              <p className="text-base leading-relaxed font-medium">{term.definition}</p>

              {!!term.example && (
                <div className="mt-4 rounded-lg border border-base-300/60 bg-base-200/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Example
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-base-content/60">
                    {term.example}
                  </p>
                </div>
              )}

              {!!term.discussion && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    In practice
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-base-content/60">
                    {term.discussion}
                  </p>
                </div>
              )}

              {term.controversy && (
                <div className="mt-3 flex gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      Debated
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-base-content/60">
                      {term.controversy}
                    </p>
                  </div>
                </div>
              )}

              {term.relationships.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {term.relationships.map((relationship) => (
                    <li
                      key={`${relationship.id}-${relationship.direction}`}
                      className="rounded-lg border border-dashed border-base-300 bg-base-200/30 px-3 py-2.5"
                    >
                      <p className="text-sm text-base-content/60">
                        <span className="italic">{relationship.relationshipType}</span>{" "}
                        <span className="font-semibold text-primary">
                          {relationship.relatedTermName}
                        </span>
                      </p>
                      {relationship.description ? (
                        <p className="mt-1 text-xs leading-relaxed text-base-content/80">
                          {relationship.description}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              <a
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline hover:underline"
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Search className="size-3.5" aria-hidden />
                Search &ldquo;{term.term}&rdquo; on Google
              </a>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
