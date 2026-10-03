import { CAPTURE_COPY } from "@/lib/capture/copy";
import type { Selection } from "@/lib/capture/selection";
import type { Token } from "@/lib/capture/tokenize";
import { cn } from "@/lib/utils";

export function SharedSentenceChips({
  tokens,
  selection,
  term,
  onToggle,
}: {
  tokens: Token[];
  selection: Selection;
  term: string;
  onToggle: (index: number) => void;
}) {
  return (
    <section className="space-y-2" aria-label={CAPTURE_COPY.sharedHint}>
      <p className="m-0 text-sm text-base-content/70" role="status">
        {term ? CAPTURE_COPY.pickedWords(term) : CAPTURE_COPY.pickWords}
      </p>
      <div className="flex flex-wrap gap-2">
        {tokens.map((token, index) => {
          const on = selection !== null && index >= selection.start && index <= selection.end;
          return (
            <button
              key={token.start}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(index)}
              className={cn(
                "btn btn-sm min-h-11 rounded-field px-3 text-base font-normal md:min-h-8",
                on ? "btn-primary" : "btn-soft",
              )}
            >
              {token.text}
            </button>
          );
        })}
      </div>
    </section>
  );
}
