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
        <section aria-label="Related terms">
          <p className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">
            Related
          </p>
          <ul className="mt-1.5 list-none space-y-2.5">
            {term.relationships.map((relationship) => {
              const description = relationship.description?.trim() ?? "";
              return (
                <li
                  key={`${relationship.id}-${relationship.direction}`}
                  className="flex gap-2 text-sm leading-snug"
                >
                  <span className="shrink-0 text-base-content/40 select-none" aria-hidden>
                    -
                  </span>
                  <div className="min-w-0">
                    <p>
                      <span>{relationship.relationshipType}</span>{" "}
                      <span className="font-semibold">{relationship.relatedTermName}</span>
                    </p>
                    {description ? (
                      <p className="mt-1 max-w-prose leading-relaxed text-base-content/60">
                        {description}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
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
