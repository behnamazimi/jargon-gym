import {
  Ban,
  ExternalLink,
  Lightbulb,
  MessagesSquare,
  Quote,
  Signpost,
  StickyNote,
} from "lucide-react";
import Link from "next/link";
import type { DomainLanguage } from "@/lib/jargon/languages";
import { TERM_LABELS, type TermLabels as Labels } from "@/lib/jargon/term-labels";
import { relationshipLabel } from "@/lib/jargon/relationship-label";
import type { Term } from "@/lib/jargon/types";
import { cn } from "@/lib/utils";
import { TermDetailSection } from "./term-detail-section";

type TermBodyProps = {
  term: Term;
  className?: string;
  showSearchLink?: boolean;
  language?: DomainLanguage;
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
  note: string | null;
};

function getTermDetails(term: Term): TermDetails {
  return {
    example: hasText(term.example) ? term.example.trim() : null,
    mentalModel: hasText(term.mentalModel) ? term.mentalModel.trim() : null,
    discussion: hasText(term.discussion) ? term.discussion.trim() : null,
    antiExample: hasText(term.antiExample) ? term.antiExample.trim() : null,
    controversy: hasText(term.controversy) ? term.controversy.trim() : null,
    note: hasText(term.note) ? term.note.trim() : null,
  };
}

function TermDetailSections({ details, labels }: { details: TermDetails; labels: Labels }) {
  return (
    <>
      {details.mentalModel ? (
        <TermDetailSection icon={Lightbulb} label={labels.mentalModel}>
          {details.mentalModel}
        </TermDetailSection>
      ) : null}
      {details.example ? (
        <TermDetailSection icon={Quote} label={labels.example}>
          {details.example}
        </TermDetailSection>
      ) : null}
      {details.antiExample ? (
        <TermDetailSection icon={Ban} label={labels.antiExample} variant="anti">
          {details.antiExample}
        </TermDetailSection>
      ) : null}
      {details.discussion ? (
        <TermDetailSection icon={Signpost} label={labels.discussion}>
          {details.discussion}
        </TermDetailSection>
      ) : null}
      {details.controversy ? (
        <TermDetailSection icon={MessagesSquare} label={labels.controversy} variant="debated">
          {details.controversy}
        </TermDetailSection>
      ) : null}
      {details.note ? (
        <TermDetailSection icon={StickyNote} label={labels.note}>
          {details.note}
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
    return <span className="font-medium text-base-content">{relationship.relatedTermName}</span>;
  }
  return (
    <Link
      href={href}
      className="font-medium text-base-content underline decoration-base-content/30 underline-offset-2 hover:decoration-base-content"
    >
      {relationship.relatedTermName}
    </Link>
  );
}

type RelationshipsListProps = {
  term: Term;
  labels: Labels;
  getRelationshipHref?: (relatedTermId: string) => string | undefined;
};

function RelationshipsList({ term, labels, getRelationshipHref }: RelationshipsListProps) {
  if (term.relationships.length === 0) return null;
  return (
    <ul
      aria-label={labels.relatedTerms}
      className="m-0 mt-2 reading-text max-w-prose list-disc space-y-2 ps-5 text-base text-base-content/90"
    >
      {term.relationships.map((relationship) => {
        const description = relationship.description?.trim() ?? "";
        const href = getRelationshipHref?.(relationship.relatedTermId);
        return (
          <li key={`${relationship.id}-${relationship.direction}`}>
            <span>
              {relationshipLabel(relationship.relationshipType)}{" "}
              <RelatedTermLink relationship={relationship} href={href} />
            </span>
            {description ? (
              <span className="mt-1 block whitespace-pre-line text-base-content/70">
                {description}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function SearchLink({ term, labels }: { term: Term; labels: Labels }) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${term.term} definition`)}`;
  return (
    <a
      className="inline-flex items-center gap-2 text-base text-base-content/70 no-underline transition-colors duration-150 hover:text-base-content hover:underline"
      href={searchUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <ExternalLink className="size-3.5" aria-hidden strokeWidth={1.5} />
      {labels.searchOnGoogle(term.term)}
    </a>
  );
}

export function TermBody({
  term,
  className,
  showSearchLink = true,
  language = "en",
  getRelationshipHref,
}: TermBodyProps) {
  const details = getTermDetails(term);
  const labels = TERM_LABELS[language];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="reading-text m-0 max-w-prose text-base whitespace-pre-line text-base-content/90">
        {term.definition}
      </p>

      <TermDetailSections details={details} labels={labels} />

      <RelationshipsList term={term} labels={labels} getRelationshipHref={getRelationshipHref} />

      {showSearchLink ? <SearchLink term={term} labels={labels} /> : null}
    </div>
  );
}
