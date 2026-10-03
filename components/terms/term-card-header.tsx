import type { CSSProperties, ReactNode } from "react";
import { TermNarrationPlayer } from "@/components/terms/term-narration-player";
import type { ReviewTerm } from "@/lib/review/types";

/** Revealed-card title/meta header, shared by Read and Review. `style` lets
 *  a caller reserve extra inline-end padding — e.g. fullscreen Read keeps
 *  the narration button clear of its own pinned exit icon — without
 *  shrinking the header element itself (which would cut its bottom
 *  border short of the edge). */
export function TermCardHeader({
  term,
  narrationAccess,
  narrationPreload = false,
  actions,
  style,
}: {
  term: ReviewTerm;
  narrationAccess: boolean;
  narrationPreload?: boolean;
  /** Extra controls shown beside the narration button. */
  actions?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <header
      className="flex shrink-0 items-start justify-between gap-3 border-b border-base-300/60 px-5 py-3 sm:px-6"
      style={style}
    >
      <div>
        <h2 className="font-heading m-0 text-xl font-medium text-base-content sm:text-2xl sm:leading-tight">
          {term.term}
        </h2>
        <p className="mt-1 mb-0 text-xs text-base-content/70">
          <span>{term.domainName}</span>
          {term.category ? (
            <>
              <span className="mx-1.5 text-base-content/50" aria-hidden>
                ·
              </span>
              <span>{term.category}</span>
            </>
          ) : null}
        </p>
      </div>
      {narrationAccess || actions ? (
        <div className="flex items-center gap-1">
          {actions}
          {narrationAccess ? (
            <TermNarrationPlayer termId={term.id} preload={narrationPreload} />
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
