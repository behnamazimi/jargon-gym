import Link from "next/link";
import { PublicCta } from "@/components/public/public-cta";
import { pickRelated } from "@/lib/collections/pick";
import { countLabel } from "@/lib/terms/kinds";
import type { PublicDomain, PublicTermSummary } from "@/lib/terms/public-terms";

type TermPageBlockProps = {
  domain: PublicDomain;
  current: { slug: string; category: string | null };
  terms: PublicTermSummary[];
};

/** Under a term: the collection it belongs to, a way in, and a few neighbours to read next. */
export function TermPageBlock({ domain, current, terms }: TermPageBlockProps) {
  const related = pickRelated(current, terms);
  const lang = domain.language === "en" ? undefined : domain.language;

  return (
    <aside className="mt-16 border-t-2 border-base-content/80 pt-8">
      <p className="m-0 max-w-[52ch] text-lg leading-relaxed text-base-content/85">
        One of {countLabel(domain.kind, terms.length)} in{" "}
        <Link
          href={`/collections/${domain.slug}`}
          className="font-medium text-base-content underline underline-offset-2"
        >
          <span lang={lang}>{domain.name}</span>
        </Link>
        . Lobyas brings them back across Read, Review and Quiz until they stick.
      </p>
      <div className="mt-6">
        <PublicCta collection={{ id: domain.id, name: domain.name, canAdd: domain.canAdd }} />
      </div>

      {related.length > 0 ? (
        <div className="mt-12">
          <h2 className="m-0 text-sm font-normal text-base-content/70">
            Next in {current.category}
          </h2>
          <ul className="m-0 mt-4 grid list-none grid-cols-1 gap-x-8 gap-y-6 p-0 sm:grid-cols-3">
            {related.map((term) => (
              <li key={term.slug} className="border-t border-base-300 pt-3">
                <Link
                  href={`/collections/${domain.slug}/${term.slug}`}
                  className="group block text-base-content no-underline"
                >
                  <span
                    lang={lang}
                    className="font-heading text-xl font-medium tracking-tight group-hover:underline group-hover:underline-offset-4"
                  >
                    {term.term}
                  </span>
                  <span
                    lang={lang}
                    className="mt-1 line-clamp-2 block text-sm leading-relaxed text-base-content/70"
                  >
                    {term.definition}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
