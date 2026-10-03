"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { PublicTermSummary } from "@/lib/terms/public-terms";

type DomainTermsListProps = {
  domainSlug: string;
  terms: PublicTermSummary[];
};

export function DomainTermsList({ domainSlug, terms }: DomainTermsListProps) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const visibleTerms = category ? terms.filter((term) => term.category === category) : terms;

  return (
    <div className="flex flex-col gap-3">
      {category ? (
        <div className="flex items-center gap-2 text-sm text-base-content/70">
          Filtered by <span className="font-medium text-base-content">{category}</span>
          <Link
            href={`/j/${domainSlug}`}
            className="text-base-content/70 no-underline hover:text-base-content hover:underline"
          >
            Clear
          </Link>
        </div>
      ) : null}

      {visibleTerms.length === 0 ? (
        <p className="text-base text-base-content/70">No terms in this category.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleTerms.map((term) => (
            <li key={term.slug}>
              <Link
                href={`/j/${domainSlug}/${term.slug}`}
                className="block rounded-field border border-base-300 bg-base-100 px-4 py-3 no-underline transition-colors duration-150 hover:border-primary/50"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-medium text-base-content">{term.term}</span>
                  {term.category ? (
                    <span className="shrink-0 text-sm text-base-content/70">{term.category}</span>
                  ) : null}
                </div>
                <p className="m-0 mt-1 line-clamp-2 text-sm text-base-content/70">
                  {term.definition}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
