import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import { FirstExposureKnownPrompt } from "@/components/jargon/first-exposure-known-prompt";
import { QuizKeyboardHint, QuizPanel } from "@/components/jargon/quiz/quiz-ui";
import { TermCardHeader } from "@/components/jargon/term-card-header";
import { TermBody } from "@/components/jargon/term-body";
import { Button } from "@/components/ui/button";
import type { ReviewTerm } from "@/lib/review/types";

const PRESS_CLASS = "transition-transform duration-150 ease-out active:scale-[0.96]";

function ReadCardMasked({ term, onReveal }: { term: ReviewTerm; onReveal: () => void }) {
  return (
    <div
      className="flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center gap-3 px-5 py-4 text-center sm:px-6"
      role="button"
      tabIndex={0}
      onClick={onReveal}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onReveal();
        }
      }}
      aria-label={`What is ${term.term}? Tap to reveal the definition.`}
    >
      <h2 className="font-heading m-0 max-w-full text-2xl font-semibold tracking-tight text-balance text-base-content sm:text-3xl sm:leading-tight">
        What is <span className="italic">{term.term}</span>?
      </h2>
      <p className="m-0 text-xs tracking-wide text-base-content/50">
        <span>{term.domainName}</span>
        <span className="mx-1.5 text-base-content/35" aria-hidden>
          ·
        </span>
        <span>{term.category}</span>
      </p>
      <div className="mt-1 flex items-center gap-2 text-sm text-base-content/60">
        <Eye className="size-4 shrink-0" aria-hidden strokeWidth={1.5} />
        <span className="inline md:hidden coarse:inline">Tap to reveal</span>
        <span className="hidden md:inline coarse:hidden">Click or press Enter to reveal</span>
      </div>
    </div>
  );
}

function ReadCardRevealed({
  term,
  narrationAccess,
  onMarkedKnown,
}: {
  term: ReviewTerm;
  narrationAccess: boolean;
  onMarkedKnown: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [term.id]);

  return (
    <>
      <TermCardHeader term={term} narrationAccess={narrationAccess} />
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        {term.isNewToUser ? (
          <FirstExposureKnownPrompt termId={term.id} onMarkedKnown={onMarkedKnown} />
        ) : null}
        <TermBody key={term.id} term={term} />
      </div>
    </>
  );
}

export const ReadTermCard = memo(function ReadTermCard({
  term,
  revealed,
  canGoBack,
  isPending,
  narrationAccess,
  onReveal,
  onPrevious,
  onNext,
}: {
  term: ReviewTerm;
  revealed: boolean;
  canGoBack: boolean;
  isPending: boolean;
  narrationAccess: boolean;
  onReveal: (termId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <QuizPanel className="flex min-h-0 flex-1 flex-col">
      {revealed ? (
        <ReadCardRevealed term={term} narrationAccess={narrationAccess} onMarkedKnown={onNext} />
      ) : (
        <ReadCardMasked term={term} onReveal={() => onReveal(term.id)} />
      )}
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-base-300/60 px-5 py-3 sm:px-6">
        <div className="hidden min-w-0 md:block coarse:hidden">
          <QuizKeyboardHint action={revealed ? "go to the next term" : "reveal the answer"} />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {canGoBack ? (
            <Button
              type="button"
              variant="outline"
              onPress={onPrevious}
              isDisabled={isPending}
              className={`min-h-11 pe-4 ps-3.5 ${PRESS_CLASS}`}
            >
              <ArrowLeft className="size-4" aria-hidden strokeWidth={1.5} />
              Previous
            </Button>
          ) : null}
          {revealed ? (
            <Button
              type="button"
              onPress={onNext}
              isDisabled={isPending}
              className={`min-h-11 flex-1 ps-4 pe-3.5 md:flex-none ${PRESS_CLASS}`}
            >
              {isPending ? "Loading…" : "Next term"}
              <ArrowRight className="size-4" aria-hidden strokeWidth={1.5} />
            </Button>
          ) : (
            <Button
              type="button"
              onPress={() => onReveal(term.id)}
              className={`min-h-11 flex-1 ps-4 pe-3.5 md:flex-none ${PRESS_CLASS}`}
            >
              Reveal
              <Eye className="size-4" aria-hidden strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </footer>
    </QuizPanel>
  );
});
