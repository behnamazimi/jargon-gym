import type { CollectionLanguage } from "@/lib/terms/languages";
import { TermCard, type TermCardTerm } from "./term-card";

type TermCardGridProps = {
  language: CollectionLanguage;
  terms: TermCardTerm[];
};

export function TermCardGrid({ language, terms }: TermCardGridProps) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {terms.map((term) => (
        <li key={term.term}>
          <TermCard term={term} language={language} />
        </li>
      ))}
    </ul>
  );
}
