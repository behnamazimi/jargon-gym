"use client";

import { AlertTriangle, Check, ChevronRight, Search } from "lucide-react";
import type { Term } from "@/lib/jargon/types";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

type TermCardProps = {
  term: Term;
  known: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onToggleKnown: () => void;
};

export function TermCard({ term, known, open, onToggleOpen, onToggleKnown }: TermCardProps) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(term.term + " definition")}`;

  return (
    <Collapsible
      isExpanded={open}
      onExpandedChange={(expanded) => {
        if (expanded !== open) onToggleOpen();
      }}
      className={cn(
        "overflow-hidden rounded-lg bg-card text-card-foreground ring-1 transition-all duration-200",
        open
          ? "ring-primary/30 shadow-md"
          : "ring-foreground/10 hover:shadow-sm hover:ring-foreground/20",
        known && !open && "opacity-70",
      )}
      data-term={term.term}
    >
      <div
        className={cn(
          "flex items-stretch gap-3 px-4 py-3 transition-colors",
          open && "border-b border-primary/15 bg-primary/5",
        )}
      >
        <div className="flex shrink-0 items-center">
          <Toggle
            size="sm"
            isSelected={known}
            onChange={onToggleKnown}
            aria-label={known ? "Mark as not known" : "Mark as known"}
            className={cn(
              "size-6 min-w-6 rounded-full border-2 p-0 opacity-100 hover:bg-transparent data-selected:hover:bg-primary",
              known
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary"
                : "border-muted-foreground/30 bg-background text-transparent hover:border-primary hover:text-primary/40",
            )}
          >
            <Check className="size-3.5 stroke-[3]" aria-hidden />
          </Toggle>
        </div>
        <CollapsibleTrigger className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-md border-none bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span
            className={cn(
              "font-heading text-base font-semibold tracking-tight",
              known
                ? "text-muted-foreground line-through decoration-primary/60 decoration-2"
                : "text-foreground",
            )}
          >
            {term.term}
          </span>
          <span className="inline-flex shrink-0 items-center gap-2">
            <Badge className="border-0 bg-primary/10 font-normal text-primary hover:bg-primary/10">
              {term.category}
            </Badge>
            <ChevronRight
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-200",
                open && "rotate-90 text-primary",
              )}
              aria-hidden
            />
          </span>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="px-4 pt-4 pb-5">
          <p className="text-base leading-relaxed font-medium">{term.definition}</p>

          {!!term.example && (
            <div className="mt-4 rounded-lg border border-border/60 bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Example</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{term.example}</p>
            </div>
          )}

          {!!term.discussion && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                In practice
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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
                  className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5"
                >
                  <p className="text-sm text-muted-foreground">
                    <span className="italic">{relationship.relationshipType}</span>{" "}
                    <span className="font-semibold text-primary">
                      {relationship.relatedTermName}
                    </span>
                  </p>
                  {relationship.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
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
    </Collapsible>
  );
}
