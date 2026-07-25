import type { Term } from "@/lib/jargon/types";

type TermCardProps = {
  term: Term;
  known: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onToggleKnown: () => void;
};

export function TermCard({ term, known, open, onToggleOpen, onToggleKnown }: TermCardProps) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(term.term + " definition")}`;

  return (
    <div
      className={`rounded-card border border-border bg-surface px-4 py-[13px] shadow-sm transition-[border-color] duration-100 ${known ? "opacity-65" : ""}`}
      data-term={term.term}
    >
      <div
        className="flex cursor-pointer items-center justify-between gap-2.5"
        onClick={onToggleOpen}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            className={`flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] text-xs leading-none transition-[background,border-color,color,opacity] duration-150 ${
              known
                ? "border-success bg-success text-white opacity-100"
                : "border-border bg-background text-muted opacity-45 hover:border-success hover:opacity-80"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleKnown();
            }}
            title={known ? "Mark as not known" : "Mark as known"}
          >
            ✓
          </button>
          <span
            className={`text-[15px] font-semibold ${known ? "text-foreground line-through decoration-success decoration-[1.5px]" : "text-foreground"}`}
          >
            {term.term}
          </span>
          <span className="shrink-0 rounded-full bg-accent-subtle px-2 py-0.5 text-[10.5px] text-accent">
            {term.category}
          </span>
        </div>
        <span
          className={`shrink-0 text-xs text-muted transition-transform duration-[180ms] ${open ? "rotate-90" : ""}`}
          title="Expand for definition, example, and discussion"
        >
          ▶
        </span>
      </div>
      {open && (
        <div className="mt-2.5 border-t border-border pt-2.5">
          <div className="mb-2 text-[13.5px] leading-normal">{term.definition}</div>
          {!!term.example && (
            <div className="rounded-lg bg-background px-2.5 py-2 text-[13px] leading-normal text-muted">
              <b className="font-semibold text-foreground">Example:</b> {term.example}
            </div>
          )}
          {!!term.discussion && (
            <div className="mt-2 text-[13px] leading-normal text-muted">
              <b className="font-semibold text-foreground">In practice:</b> {term.discussion}
            </div>
          )}
          {term.controversy && (
            <div className="mt-2 rounded-md border-l-[3px] border-accent bg-background px-2.5 py-2 text-[13px] leading-normal text-muted">
              <b className="font-semibold text-foreground">⚠ Debated:</b> {term.controversy}
            </div>
          )}
          {term.relationships.length > 0 && (
            <ul className="mt-2 space-y-2">
              {term.relationships.map((relationship) => (
                <li
                  key={`${relationship.id}-${relationship.direction}`}
                  className="rounded-lg bg-background px-2.5 py-2 text-[13px] leading-normal text-muted"
                >
                  <span className="text-foreground">
                    {relationship.relationshipType}{" "}
                    <b className="font-semibold">{relationship.relatedTermName}</b>
                  </span>
                  {relationship.description ? (
                    <p className="mt-1 mb-0 text-[12.5px]">{relationship.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <a
            className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] text-accent no-underline hover:underline"
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            🔍 Search &ldquo;{term.term}&rdquo; on Google
          </a>
        </div>
      )}
    </div>
  );
}
