import { TermNarrationPlayer } from "@/components/jargon/term-narration-player";
import type { ReviewTerm } from "@/lib/review/types";

/** Revealed-card title/meta header, shared by Read and Review. */
export function TermCardHeader({
  term,
  narrationAccess,
}: {
  term: ReviewTerm;
  narrationAccess: boolean;
}) {
  return (
    <header className="flex shrink-0 items-start justify-between gap-3 border-b border-base-300/60 px-5 py-3 sm:px-6">
      <div>
        <h2 className="font-heading m-0 text-xl font-semibold tracking-tight text-base-content sm:text-2xl sm:leading-tight">
          {term.term}
        </h2>
        <p className="mt-1 mb-0 text-xs tracking-wide text-base-content/50">
          <span>{term.domainName}</span>
          <span className="mx-1.5 text-base-content/35" aria-hidden>
            ·
          </span>
          <span>{term.category}</span>
        </p>
      </div>
      {narrationAccess ? <TermNarrationPlayer termId={term.id} /> : null}
    </header>
  );
}
