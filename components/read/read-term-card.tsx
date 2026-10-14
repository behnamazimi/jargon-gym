import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import { memo } from "react";
import { FirstExposureKnownPrompt } from "@/components/shared/first-exposure-known-prompt";
import { QuizKeyboardHint, QuizPanel } from "@/components/quiz/quiz-ui";
import { TermCardHeader } from "@/components/terms/term-card-header";
import { StudyTermBody } from "@/components/terms/study-term-body";
import { Button } from "@/components/ui/button";
import type { ReviewTerm } from "@/lib/review/types";

const PRESS_CLASS = "transition-transform duration-150 ease-out active:scale-[0.96]";

function ReadCardMasked({
  term,
  hideQuestion,
  onReveal,
}: {
  term: ReviewTerm;
  hideQuestion: boolean;
  onReveal: () => void;
}) {
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
      aria-label={`${hideQuestion ? `${term.term}.` : `What is ${term.term}?`} Tap to reveal the definition.`}
    >
      <h2 className="font-heading m-0 max-w-full text-[1.75rem] font-medium text-balance text-base-content sm:text-3xl sm:leading-tight">
        {hideQuestion ? (
          term.term
        ) : (
          <>
            What is <span className="italic">{term.term}</span>?
          </>
        )}
      </h2>
      <p className="m-0 text-xs text-base-content/70">
        <span>{term.collectionName}</span>
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
  );
}

function ReadCardRevealed({
  term,
  onMarkedKnown,
}: {
  term: ReviewTerm;
  onMarkedKnown: () => void;
}) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 has-[[data-known-prompt]]:pb-0 sm:px-6">
        <StudyTermBody key={term.id} term={term} />
        {term.isNewToUser ? (
          <FirstExposureKnownPrompt
            termId={term.id}
            term={term.term}
            onMarkedKnown={onMarkedKnown}
          />
        ) : null}
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
  hideQuestion,
  onReveal,
  onPrevious,
  onNext,
}: {
  term: ReviewTerm;
  revealed: boolean;
  canGoBack: boolean;
  isPending: boolean;
  narrationAccess: boolean;
  hideQuestion: boolean;
  onReveal: (termId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <QuizPanel data-tour="read-card" className="flex min-h-0 flex-1 flex-col">
      <div
        className={revealed ? undefined : "invisible pointer-events-none h-0 overflow-hidden"}
        aria-hidden={!revealed}
      >
        <TermCardHeader term={term} narrationAccess={narrationAccess} narrationPreload />
      </div>
      {revealed ? (
        <ReadCardRevealed term={term} onMarkedKnown={onNext} />
      ) : (
        <ReadCardMasked
          term={term}
          hideQuestion={hideQuestion}
          onReveal={() => onReveal(term.id)}
        />
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
              Show definition
              <Eye className="size-4" aria-hidden strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </footer>
    </QuizPanel>
  );
});
