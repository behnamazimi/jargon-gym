import { cn } from "@/lib/utils";

type QuizProgressProps = {
  current: number;
  total: number;
  className?: string;
};

export function QuizProgress({ current, total, className }: QuizProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3 text-[12px] text-base-content/60">
        <span>
          Question {current} of {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Question ${current} of ${total}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
