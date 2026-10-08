import type { CollectionLanguage } from "@/lib/terms/languages";
import type { PublicTermSummary } from "@/lib/terms/public-terms";
import { TermCard } from "./term-card";

type TermCardGridProps = {
  language: CollectionLanguage;
  terms: PublicTermSummary[];
};

export function TermCardGrid({ language, terms }: TermCardGridProps) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {terms.map((term) => (
        <li key={term.slug}>
          <TermCard term={term} language={language} />
        </li>
      ))}
    </ul>
  );
}
