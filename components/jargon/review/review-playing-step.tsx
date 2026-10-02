import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PressEvent } from "react-aria-components";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { canMoveForward } from "@/lib/review/keyboard";
import { AGAIN, EASY, GOOD, HARD, type ReviewGrade } from "@/lib/trace";
import type { ReviewRating, ReviewTerm } from "@/lib/review/types";
import { ReviewCard } from "@/components/jargon/review/review-card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const GRADE_LABELS: Record<ReviewGrade, string> = {
  [AGAIN]: "Again",
  [HARD]: "Hard",
  [GOOD]: "Good",
  [EASY]: "Easy",
};

const GRADE_BUTTONS: { grade: ReviewGrade; variant: ButtonVariant }[] = [
  { grade: AGAIN, variant: "destructive" },
  { grade: HARD, variant: "warning" },
  { grade: GOOD, variant: "success" },
  { grade: EASY, variant: "info" },
];

/** Tinted study-action buttons (Review grades, Triage choices). */
export const SOFT_ACTION_BUTTON_CLASS = cn(
  "btn-soft min-h-11 text-base-content transition-transform active:scale-[0.96]",
  "[--btn-bg:color-mix(in_oklab,var(--btn-color)_45%,var(--color-base-100))]",
  "[--btn-border:color-mix(in_oklab,var(--btn-color)_55%,var(--color-base-100))]",
  "[color:var(--btn-fg)]",
);

const NAV_BUTTON_CLASS =
  "min-h-11 min-w-11 transition-transform active:scale-[0.96] md:min-h-8 md:min-w-8";

/** A clicked or tapped button keeps focus, and a focused button owns
 *  Enter — so the next Enter would press it again instead of revealing.
 *  Keyboard presses keep focus where the user put it. */
export function releaseFocusAfterPointerPress(event: PressEvent) {
  if (event.pointerType === "mouse" || event.pointerType === "touch") {
    (event.target as HTMLElement).blur();
  }
}

type ReviewPlayingStepProps = {
  currentCard: ReviewTerm;
  canGoBack: boolean;
  currentRevealed: boolean;
  currentRating: ReviewRating | undefined;
  errorMessage: string | null;
  reduceMotion: boolean;
  narrationAccess: boolean;
  canEvaluateTerms: boolean;
  collectionControl: ReactNode;
  onReveal: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onMarkedKnown: () => void;
  onRate: (grade: ReviewGrade) => void;
};

export function ReviewPlayingStep({
  currentCard,
  canGoBack,
  currentRevealed,
  currentRating,
  errorMessage,
  reduceMotion,
  narrationAccess,
  canEvaluateTerms,
  collectionControl,
  onReveal,
  onPrevious,
  onNext,
  onMarkedKnown,
  onRate,
}: ReviewPlayingStepProps) {
  const rated = currentRating !== undefined;
  const showForward = canMoveForward({ revealed: currentRevealed, rated });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        {collectionControl}
        <div className="flex items-center gap-1">
          {canGoBack ? (
            <Button
              type="button"
              variant="ghost"
              onPress={(event) => {
                releaseFocusAfterPointerPress(event);
                onPrevious();
              }}
              className={NAV_BUTTON_CLASS}
              aria-label="Previous term"
            >
              <ChevronLeft className="size-4" aria-hidden strokeWidth={1.5} />
            </Button>
          ) : null}
          {showForward ? (
            <Button
              type="button"
              variant="ghost"
              onPress={(event) => {
                releaseFocusAfterPointerPress(event);
                onNext();
              }}
              className={cn(NAV_BUTTON_CLASS, !currentRevealed && "gap-1 ps-3 pe-2")}
              aria-label={currentRevealed ? "Next term" : "Skip this term"}
            >
              {currentRevealed ? null : <span className="text-sm">Skip</span>}
              <ChevronRight className="size-4" aria-hidden strokeWidth={1.5} />
            </Button>
          ) : null}
        </div>
      </div>

      <ReviewCard
        key={currentCard.id}
        term={currentCard}
        revealed={currentRevealed}
        onReveal={onReveal}
        onPrevious={onPrevious}
        onNext={onNext}
        onMarkedKnown={onMarkedKnown}
        reduceMotion={reduceMotion}
        swipeEnabled
        narrationAccess={narrationAccess}
        canEvaluateTerms={canEvaluateTerms}
      />

      <div className="shrink-0 space-y-3">
        {currentRevealed ? (
          <div data-tour="review-grades" className="grid grid-cols-4 gap-2">
            {GRADE_BUTTONS.map(({ grade, variant }) => (
              <Button
                key={grade}
                type="button"
                variant={variant}
                onPress={(event) => {
                  releaseFocusAfterPointerPress(event);
                  onRate(grade);
                }}
                className={cn(
                  SOFT_ACTION_BUTTON_CLASS,
                  currentRating?.grade === grade && "ring-2 ring-primary/50",
                )}
              >
                {GRADE_LABELS[grade]}
              </Button>
            ))}
          </div>
        ) : null}

        <ReviewKeyboardHints revealed={currentRevealed} rated={rated} />
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function ReviewKeyboardHints({ revealed, rated }: { revealed: boolean; rated: boolean }) {
  return (
    <p className="m-0 hidden text-center text-xs text-base-content/70 md:block coarse:hidden">
      {revealed ? (
        <>
          <kbd className="kbd kbd-xs">1</kbd>–<kbd className="kbd kbd-xs">4</kbd> grade ·{" "}
          <kbd className="kbd kbd-xs">←</kbd> back
          {rated ? (
            <>
              {" · "}
              <kbd className="kbd kbd-xs">→</kbd> next
            </>
          ) : null}
        </>
      ) : (
        <>
          <kbd className="kbd kbd-xs">Space</kbd> reveal · <kbd className="kbd kbd-xs">→</kbd> skip
          · <kbd className="kbd kbd-xs">←</kbd> back
        </>
      )}
    </p>
  );
}
