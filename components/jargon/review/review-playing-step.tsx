import { ChevronLeft, ChevronRight } from "lucide-react";
import { QuizKeyboardHint } from "@/components/jargon/quiz/quiz-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, type ButtonVariant } from "@/components/ui/button";
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

type ReviewPlayingStepProps = {
  currentCard: ReviewTerm;
  canGoBack: boolean;
  canGoForward: boolean;
  currentRevealed: boolean;
  currentRating: ReviewRating | undefined;
  errorMessage: string | null;
  reduceMotion: boolean;
  narrationAccess: boolean;
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
  canGoForward,
  currentRevealed,
  currentRating,
  errorMessage,
  reduceMotion,
  narrationAccess,
  collectionControl,
  onReveal,
  onPrevious,
  onNext,
  onMarkedKnown,
  onRate,
}: ReviewPlayingStepProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-center">{collectionControl}</div>

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
      />

      <div className="shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onPress={onPrevious}
            isDisabled={!canGoBack}
            className="min-h-11 min-w-11 transition-transform active:scale-[0.96]"
            aria-label="Previous term"
          >
            <ChevronLeft className="size-4" aria-hidden strokeWidth={1.5} />
          </Button>

          {currentRevealed ? (
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADE_BUTTONS.map(({ grade, variant }) => (
                <Button
                  key={grade}
                  type="button"
                  variant={variant}
                  onPress={() => onRate(grade)}
                  className={cn(
                    "btn-soft min-h-11 transition-transform active:scale-[0.96]",
                    "[--btn-bg:color-mix(in_oklab,var(--btn-color)_45%,var(--color-base-100))]",
                    "[--btn-border:color-mix(in_oklab,var(--btn-color)_55%,var(--color-base-100))]",
                    "[color:var(--btn-fg)]",
                    currentRating?.grade === grade && "ring-2 ring-primary/50",
                  )}
                >
                  {GRADE_LABELS[grade]}
                </Button>
              ))}
            </div>
          ) : (
            <span className="flex-1" />
          )}

          <Button
            type="button"
            variant="ghost"
            onPress={onNext}
            isDisabled={!canGoForward}
            className="min-h-11 min-w-11 transition-transform active:scale-[0.96]"
            aria-label="Next term"
          >
            <ChevronRight className="size-4" aria-hidden strokeWidth={1.5} />
          </Button>
        </div>

        <p className="m-0 hidden text-center text-xs text-base-content/50 md:block coarse:hidden">
          <QuizKeyboardHint action="reveal" />
          {" · "}
          <kbd className="kbd kbd-xs">1</kbd>-<kbd className="kbd kbd-xs">4</kbd> grade ·{" "}
          <kbd className="kbd kbd-xs">←</kbd>
          <kbd className="kbd kbd-xs">→</kbd>
        </p>
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
