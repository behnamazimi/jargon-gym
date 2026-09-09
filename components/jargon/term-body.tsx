import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Term } from "@/lib/jargon/types";
import { cn } from "@/lib/utils";
import { TermDetailSection } from "./term-detail-section";

type TermBodyProps = {
  term: Term;
  className?: string;
  showSearchLink?: boolean;
  getRelationshipHref?: (relatedTermId: string) => string | undefined;
};

function hasText(value: string | undefined): value is string {
  return Boolean(value?.trim());
}

type TermDetails = {
  example: string | null;
  mentalModel: string | null;
  discussion: string | null;
  antiExample: string | null;
  controversy: string | null;
};

function getTermDetails(term: Term): TermDetails {
  return {
    example: hasText(term.example) ? term.example.trim() : null,
    mentalModel: hasText(term.mentalModel) ? term.mentalModel.trim() : null,
    discussion: hasText(term.discussion) ? term.discussion.trim() : null,
    antiExample: hasText(term.antiExample) ? term.antiExample.trim() : null,
    controversy: hasText(term.controversy) ? term.controversy.trim() : null,
  };
}

function TermDetailSections({ details }: { details: TermDetails }) {
  return (
    <>
      {details.mentalModel ? (
        <TermDetailSection emoji="💡" label="Mental model">
          {details.mentalModel}
        </TermDetailSection>
      ) : null}
      {details.example ? (
        <TermDetailSection emoji="📌" label="Example">
          {details.example}
        </TermDetailSection>
      ) : null}
      {details.antiExample ? (
        <TermDetailSection emoji="⚠️" label="Anti-example" variant="anti">
          {details.antiExample}
        </TermDetailSection>
      ) : null}
      {details.discussion ? (
        <TermDetailSection emoji="🛠" label="In practice">
          {details.discussion}
        </TermDetailSection>
      ) : null}
      {details.controversy ? (
        <TermDetailSection emoji="⚡" label="Debated" variant="debated">
          {details.controversy}
        </TermDetailSection>
      ) : null}
    </>
  );
}

type RelatedTermLinkProps = {
  relationship: Term["relationships"][number];
  href: string | undefined;
};

function RelatedTermLink({ relationship, href }: RelatedTermLinkProps) {
  if (!href) {
    return <span className="font-semibold text-base-content">{relationship.relatedTermName}</span>;
  }
  return (
    <Link
      href={href}
      className="font-semibold text-base-content underline decoration-base-content/30 underline-offset-2 hover:decoration-base-content"
    >
      {relationship.relatedTermName}
    </Link>
  );
}

type RelationshipsListProps = {
  term: Term;
  getRelationshipHref?: (relatedTermId: string) => string | undefined;
};

function RelationshipsList({ term, getRelationshipHref }: RelationshipsListProps) {
  if (term.relationships.length === 0) return null;
  return (
    <ul
      aria-label="Related terms"
      className="m-0 mt-2 max-w-prose list-disc space-y-2 ps-5 text-base leading-relaxed text-base-content/85"
    >
      {term.relationships.map((relationship) => {
        const description = relationship.description?.trim() ?? "";
        const href = getRelationshipHref?.(relationship.relatedTermId);
        return (
          <li key={`${relationship.id}-${relationship.direction}`}>
            <span>
              {relationship.relationshipType}{" "}
              <RelatedTermLink relationship={relationship} href={href} />
            </span>
            {description ? (
              <span className="mt-1 block text-base-content/65">{description}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function SearchLink({ term }: { term: Term }) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${term.term} definition`)}`;
  return (
    <a
      className="inline-flex items-center gap-1.5 text-base text-base-content/55 no-underline transition-colors duration-150 hover:text-base-content hover:underline"
      href={searchUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <ExternalLink className="size-3.5" aria-hidden strokeWidth={1.5} />
      Search &ldquo;{term.term}&rdquo; on Google
    </a>
  );
}

export function TermBody({
  term,
  className,
  showSearchLink = true,
  getRelationshipHref,
}: TermBodyProps) {
  const details = getTermDetails(term);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="m-0 max-w-prose text-base leading-relaxed text-base-content/85">
        {term.definition}
      </p>

      <TermDetailSections details={details} />

      <RelationshipsList term={term} getRelationshipHref={getRelationshipHref} />

      {showSearchLink ? <SearchLink term={term} /> : null}
    </div>
  );
}
