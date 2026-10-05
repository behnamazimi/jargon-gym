import { SectionHeading } from "@/components/public/section-heading";
import type { DomainLanguage } from "@/lib/terms/languages";
import type { PublicTermSummary } from "@/lib/terms/public-terms";
import { TermCard } from "./term-card";

const OTHER = "Other";

type Group = { name: string; id: string; terms: PublicTermSummary[] };

export function categoryAnchor(category: string) {
  return `cat-${category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

/** Categories with the most terms first; uncategorised terms last. */
function groupByCategory(terms: PublicTermSummary[]): Group[] {
  const groups = new Map<string, PublicTermSummary[]>();
  for (const term of terms) {
    const name = term.category?.trim() || OTHER;
    groups.set(name, [...(groups.get(name) ?? []), term]);
  }
  return [...groups.entries()]
    .map(([name, list]) => ({ name, id: categoryAnchor(name), terms: list }))
    .sort((a, b) => {
      if (a.name === OTHER) return 1;
      if (b.name === OTHER) return -1;
      return b.terms.length - a.terms.length || a.name.localeCompare(b.name);
    });
}

type TermCardGridProps = {
  domainSlug: string;
  language: DomainLanguage;
  terms: PublicTermSummary[];
};

export function TermCardGrid({ domainSlug, language, terms }: TermCardGridProps) {
  const groups = groupByCategory(terms);

  return (
    <div>
      <div className="space-y-16">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={group.id}>
            <SectionHeading id={group.id} count={group.terms.length} ruled>
              {group.name}
            </SectionHeading>
            <ul className="m-0 mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {group.terms.map((term) => (
                <li key={term.slug}>
                  <TermCard
                    term={term}
                    language={language}
                    href={`/collections/${domainSlug}/${term.slug}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
