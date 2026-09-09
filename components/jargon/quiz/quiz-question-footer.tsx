import { ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizKeyboardHint } from "@/components/jargon/quiz/quiz-ui";
import { cn } from "@/lib/utils";

type QuizQuestionFooterProps = {
  correct: number;
  progressPercent: number;
  submitted: boolean;
  isLast: boolean;
  canSubmit: boolean;
  canAdvance: boolean;
  justUnlocked: boolean;
  onSubmit: () => void;
  onAdvance: () => void;
};

export function QuizQuestionFooter({
  correct,
  progressPercent,
  submitted,
  isLast,
  canSubmit,
  canAdvance,
  justUnlocked,
  onSubmit,
  onAdvance,
}: QuizQuestionFooterProps) {
  return (
    <footer className="flex shrink-0 flex-col gap-2 border-t border-base-300/60 px-5 py-3 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-xs tabular-nums text-base-content/60">
          {correct} correct · {progressPercent}%
        </p>
        <p className="m-0 hidden text-xs text-base-content/60 md:block coarse:hidden">
          <QuizKeyboardHint action={!submitted ? "check" : isLast ? "see results" : "continue"} />
        </p>
      </div>
      {!submitted ? (
        <Button
          type="button"
          onPress={onSubmit}
          isDisabled={!canSubmit}
          className="min-h-11 w-full transition-transform active:scale-[0.96]"
        >
          Check answer
        </Button>
      ) : (
        <Button
          type="button"
          onPress={onAdvance}
          isDisabled={!canAdvance}
          className={cn(
            "min-h-11 w-full gap-1.5 transition-transform active:scale-[0.96]",
            justUnlocked && "quiz-advance-ready",
          )}
        >
          <span
            key={isLast ? "results" : "next"}
            className="quiz-advance-label-enter inline-flex items-center gap-1.5"
          >
            {isLast ? "See results" : "Next question"}
            {isLast ? (
              <Trophy className="size-4 shrink-0" aria-hidden strokeWidth={2} />
            ) : (
              <ArrowRight className="size-4 shrink-0" aria-hidden strokeWidth={2} />
            )}
          </span>
        </Button>
      )}
    </footer>
  );
}
