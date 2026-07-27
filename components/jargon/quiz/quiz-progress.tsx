import { cn } from "@/lib/utils";

type QuizProgressProps = {
  current: number;
  total: number;
  correct?: number;
  className?: string;
};

export function QuizProgress({ current, total, correct, className }: QuizProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3 text-xs text-base-content/60">
        <span className="font-medium tabular-nums">
          Question {current} of {total}
        </span>
        <div className="flex items-center gap-3 tabular-nums">
          {typeof correct === "number" ? <span>{correct} correct</span> : null}
          <span>{percent}%</span>
        </div>
      </div>
      <progress
        className="progress progress-primary h-1.5 w-full"
        value={current}
        max={total}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Question ${current} of ${total}`}
      />
    </div>
  );
}
