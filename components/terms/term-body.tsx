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
import { Fragment, type ReactNode } from "react";
import type { CollectionLanguage } from "@/lib/terms/languages";
import { TERM_LABELS, type TermLabels as Labels } from "@/lib/terms/term-labels";
import { relationshipLabel } from "@/lib/terms/relationship-label";
import { moreCount, TERM_BLOCKS, type Placement, type TermBlock } from "@/lib/terms/term-layout";
import type { Term } from "@/lib/terms/types";
import { cn } from "@/lib/utils";
import { TermDetailSection } from "./term-detail-section";
import { TermMoreFooter } from "./term-more-footer";

type TermBodyProps = {
  term: Term;
  className?: string;
  showSearchLink?: boolean;
  language?: CollectionLanguage;
  getRelationshipHref?: (relatedTermId: string) => string | undefined;
  /** Which blocks sit under "More". Without it every block is shown. */
  placement?: Placement;
  /** The quiet button beside "More" that opens the layout editor. */
  customize?: ReactNode;
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

function detailBlocks(
  details: TermDetails,
  labels: Labels,
): Pick<Record<TermBlock, ReactNode>, Exclude<TermBlock, "relationships" | "searchLink">> {
  return {
    mentalModel: details.mentalModel ? (
      <TermDetailSection icon={Lightbulb} label={labels.mentalModel}>
        {details.mentalModel}
      </TermDetailSection>
    ) : null,
    example: details.example ? (
      <TermDetailSection icon={Quote} label={labels.example}>
        {details.example}
      </TermDetailSection>
    ) : null,
    antiExample: details.antiExample ? (
      <TermDetailSection icon={Ban} label={labels.antiExample} variant="anti">
        {details.antiExample}
      </TermDetailSection>
    ) : null,
    discussion: details.discussion ? (
      <TermDetailSection icon={Signpost} label={labels.discussion}>
        {details.discussion}
      </TermDetailSection>
    ) : null,
    controversy: details.controversy ? (
      <TermDetailSection icon={MessagesSquare} label={labels.controversy} variant="debated">
        {details.controversy}
      </TermDetailSection>
    ) : null,
    note: details.note ? (
      <TermDetailSection icon={StickyNote} label={labels.note}>
        {details.note}
      </TermDetailSection>
    ) : null,
  };
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

export function TermDefinition({ term }: { term: Pick<Term, "definition"> }) {
  return (
    <p className="reading-text m-0 max-w-prose text-base whitespace-pre-line text-base-content/90">
      {term.definition}
    </p>
  );
}

export function TermBody({
  term,
  className,
  showSearchLink = true,
  language = "en",
  getRelationshipHref,
  placement,
  customize,
}: TermBodyProps) {
  const labels = TERM_LABELS[language];
  const blocks: Record<TermBlock, ReactNode> = {
    ...detailBlocks(getTermDetails(term), labels),
    relationships: (
      <RelationshipsList term={term} labels={labels} getRelationshipHref={getRelationshipHref} />
    ),
    searchLink: showSearchLink ? <SearchLink term={term} labels={labels} /> : null,
  };
  const inPlace = (where: "shown" | "more") =>
    TERM_BLOCKS.filter((block) => (placement?.[block] ?? "shown") === where).map((block) => (
      <Fragment key={block}>{blocks[block]}</Fragment>
    ));

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <TermDefinition term={term} />

      {inPlace("shown")}

      {placement ? (
        <TermMoreFooter count={moreCount(placement, term, showSearchLink)} customize={customize}>
          {inPlace("more")}
        </TermMoreFooter>
      ) : null}
    </div>
  );
}
