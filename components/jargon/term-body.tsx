import { ExternalLink } from "lucide-react";
import type { Term } from "@/lib/jargon/types";
import { cn } from "@/lib/utils";
import { TermDetailSection } from "./term-detail-section";

type TermBodyProps = {
  term: Term;
  className?: string;
  showSearchLink?: boolean;
};

function hasText(value: string | undefined): value is string {
  return Boolean(value?.trim());
}

export function TermBody({ term, className, showSearchLink = true }: TermBodyProps) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${term.term} definition`)}`;
  const example = hasText(term.example) ? term.example.trim() : null;
  const mentalModel = hasText(term.mentalModel) ? term.mentalModel.trim() : null;
  const discussion = hasText(term.discussion) ? term.discussion.trim() : null;
  const antiExample = hasText(term.antiExample) ? term.antiExample.trim() : null;
  const controversy = hasText(term.controversy) ? term.controversy.trim() : null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="m-0 max-w-prose text-base leading-relaxed text-base-content/85">
        {term.definition}
      </p>

      {mentalModel ? (
        <TermDetailSection emoji="💡" label="Mental model">
          {mentalModel}
        </TermDetailSection>
      ) : null}
      {example ? (
        <TermDetailSection emoji="📌" label="Example">
          {example}
        </TermDetailSection>
      ) : null}
      {antiExample ? (
        <TermDetailSection emoji="⚠️" label="Anti-example" variant="anti">
          {antiExample}
        </TermDetailSection>
      ) : null}
      {discussion ? (
        <TermDetailSection emoji="🛠" label="In practice">
          {discussion}
        </TermDetailSection>
      ) : null}
      {controversy ? (
        <TermDetailSection emoji="⚡" label="Debated" variant="debated">
          {controversy}
        </TermDetailSection>
      ) : null}

      {term.relationships.length > 0 ? (
        <ul
          aria-label="Related terms"
          className="m-0 mt-2 max-w-prose list-disc space-y-2 ps-5 text-base leading-relaxed text-base-content/85"
        >
          {term.relationships.map((relationship) => {
            const description = relationship.description?.trim() ?? "";
            return (
              <li key={`${relationship.id}-${relationship.direction}`}>
                <span>
                  {relationship.relationshipType}{" "}
                  <span className="font-semibold text-base-content">
                    {relationship.relatedTermName}
                  </span>
                </span>
                {description ? (
                  <span className="mt-1 block text-base-content/65">{description}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {showSearchLink ? (
        <a
          className="inline-flex items-center gap-1.5 text-base text-base-content/55 no-underline transition-colors duration-150 hover:text-base-content hover:underline"
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
