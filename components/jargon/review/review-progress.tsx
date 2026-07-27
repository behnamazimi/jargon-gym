import { cn } from "@/lib/utils";

type ReviewProgressProps = {
  current: number;
  total: number;
  className?: string;
};

export function ReviewProgress({ current, total, className }: ReviewProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={cn("min-w-0 flex-1 space-y-2", className)}>
      <div className="flex items-center justify-between gap-3 text-xs text-base-content/60">
        <span className="font-medium tabular-nums">
          Card {current} of {total}
        </span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <progress
        className="progress progress-primary h-1.5 w-full"
        value={current}
        max={total}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Card ${current} of ${total}`}
      />
    </div>
  );
}
