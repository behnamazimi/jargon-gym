import { ExternalLink } from "lucide-react";
import type { Term } from "@/lib/jargon/types";
import { cn } from "@/lib/utils";
import { TermDetailSection } from "./term-detail-section";

type TermBodyProps = {
  term: Term;
  className?: string;
  showSearchLink?: boolean;
};

export function TermBody({ term, className, showSearchLink = true }: TermBodyProps) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${term.term} definition`)}`;

  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-base leading-relaxed font-medium">{term.definition}</p>

      {term.example ? (
        <TermDetailSection label="Example" variant="callout">
          {term.example}
        </TermDetailSection>
      ) : null}

      {term.mentalModel ? (
        <TermDetailSection label="Mental model" variant="callout">
          {term.mentalModel}
        </TermDetailSection>
      ) : null}

      {term.discussion ? (
        <TermDetailSection label="In practice">{term.discussion}</TermDetailSection>
      ) : null}

      {term.antiExample ? (
        <TermDetailSection label="Anti-example" variant="debated">
          {term.antiExample}
        </TermDetailSection>
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
                <span className="font-semibold text-primary">{relationship.relatedTermName}</span>
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

      {showSearchLink ? (
        <a
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline hover:underline"
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="size-3.5" aria-hidden strokeWidth={1.5} />
          Search &ldquo;{term.term}&rdquo; on Google
        </a>
      ) : null}
    </div>
  );
}
