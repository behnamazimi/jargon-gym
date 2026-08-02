import { AlertTriangle, ChevronRight } from "lucide-react";
import type { Term } from "@/lib/jargon/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TermDetailSection } from "@/components/jargon/term-detail-section";
import { cn } from "@/lib/utils";

type ReviewTermContentProps = {
  term: Term;
  className?: string;
};

export function ReviewTermContent({ term, className }: ReviewTermContentProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-base leading-relaxed font-medium">{term.definition}</p>

      {term.example ? (
        <TermDetailSection label="Example" variant="callout">
          {term.example}
        </TermDetailSection>
      ) : null}

      {term.discussion ? (
        <Collapsible>
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border-none bg-base-200/40 px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-base-content/60 uppercase outline-none focus-visible:ring-2 focus-visible:ring-primary">
            In practice
            <ChevronRight className="size-4 shrink-0" aria-hidden strokeWidth={1.5} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="pt-3 text-sm leading-relaxed text-base-content/60">{term.discussion}</p>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {term.controversy ? (
        <Collapsible>
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border-none bg-base-200/40 px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-base-content/60 uppercase outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Debated
            <ChevronRight className="size-4 shrink-0" aria-hidden strokeWidth={1.5} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 flex gap-2.5 rounded-lg bg-primary/5 p-3 ring-1 ring-primary/20">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
                strokeWidth={1.5}
              />
              <p className="text-sm leading-relaxed text-base-content/60">{term.controversy}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {term.relationships.length > 0 ? (
        <Collapsible>
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border-none bg-base-200/40 px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-base-content/60 uppercase outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Relationships ({term.relationships.length})
            <ChevronRight className="size-4 shrink-0" aria-hidden strokeWidth={1.5} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="space-y-2 pt-3">
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
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}
