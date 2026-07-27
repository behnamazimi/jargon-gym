"use client";

import { AlertTriangle, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { Term } from "@/lib/jargon/types";
import { Badge } from "@/components/ui/badge";
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

function TermDetailSection({
  label,
  children,
  variant = "default",
}: {
  label: string;
  children: ReactNode;
  variant?: "default" | "callout" | "debated";
}) {
  if (variant === "debated") {
    return (
      <div className="flex gap-2.5 rounded-lg bg-primary/5 p-3 ring-1 ring-primary/20">
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden
          strokeWidth={1.5}
        />
        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">{label}</p>
          <div className="mt-1 text-sm leading-relaxed text-base-content/60">{children}</div>
        </div>
      </div>
    );
  }

  if (variant === "callout") {
    return (
      <div className="rounded-lg bg-base-200/50 p-3">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{label}</p>
        <div className="mt-1 text-sm leading-relaxed text-base-content/60">{children}</div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">{label}</p>
      <div className="mt-1 text-sm leading-relaxed text-base-content/60">{children}</div>
    </div>
  );
}

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
                <Badge variant="outline" className="font-normal">
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
            <div className="space-y-4 px-4 pt-4 pb-5">
              <p className="text-base leading-relaxed font-medium">{term.definition}</p>

              {term.example ? (
                <TermDetailSection label="Example" variant="callout">
                  {term.example}
                </TermDetailSection>
              ) : null}

              {term.discussion ? (
                <TermDetailSection label="In practice">{term.discussion}</TermDetailSection>
              ) : null}

              {term.controversy ? (
                <TermDetailSection label="Debated" variant="debated">
                  {term.controversy}
                </TermDetailSection>
              ) : null}

              {term.relationships.length > 0 ? (
                <ul className="space-y-2">
                  {term.relationships.map((relationship) => (
                    <li
                      key={`${relationship.id}-${relationship.direction}`}
                      className="rounded-lg border border-dashed border-base-300/80 bg-base-200/30 px-3 py-2.5"
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
              ) : null}

              <a
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline hover:underline"
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-3.5" aria-hidden strokeWidth={1.5} />
                Search &ldquo;{term.term}&rdquo; on Google
              </a>
            </div>
          </CollapsibleContent>
        </article>
      </Collapsible>
    </div>
  );
}
