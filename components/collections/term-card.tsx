import { Quote } from "lucide-react";
import type { PublicTermSummary } from "@/lib/terms/public-terms";
import type { CollectionLanguage } from "@/lib/terms/languages";
import { TERM_LABELS } from "@/lib/terms/term-labels";

type TermCardProps = {
  term: PublicTermSummary;
  language: CollectionLanguage;
};

export function TermCard({ term, language }: TermCardProps) {
  const lang = language === "en" ? undefined : language;

  return (
    <article className="shadow-surface flex h-full flex-col gap-2 rounded-box bg-base-100 p-5 text-base-content ring-1 ring-base-content/5">
      <h3 className="m-0 font-heading text-xl font-medium leading-snug tracking-tight">
        <span lang={lang}>{term.term}</span>
      </h3>
      <p lang={lang} className="m-0 line-clamp-2 text-sm leading-relaxed text-base-content/80">
        {term.definition}
      </p>
      {term.example ? (
        <p className="m-0 mt-auto line-clamp-2 pt-1 text-sm leading-relaxed text-base-content/65">
          <span className="me-1.5 inline-flex items-baseline gap-1.5 font-semibold text-base-content/80">
            <Quote className="size-3.5 shrink-0 self-center" aria-hidden strokeWidth={2} />
            {TERM_LABELS[language].example}:
          </span>
          <span lang={lang}>{term.example}</span>
        </p>
      ) : null}
    </article>
  );
}
