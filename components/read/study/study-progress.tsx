import { cn } from "@/lib/utils";

type StudyProgressProps = {
  current: number;
  total: number;
  unitLabel: string;
  className?: string;
  /** Colours the bar; defaults to the primary colour. */
  barClassName?: string;
};

export function StudyProgress({
  current,
  total,
  unitLabel,
  className,
  barClassName = "progress-primary",
}: StudyProgressProps) {
  return (
    <div className={cn("min-w-0 w-full space-y-2", className)}>
      <div className="flex items-center justify-between gap-3 text-xs text-base-content/70">
        <span className="font-medium tabular-nums">
          {unitLabel} {current} of {total}
        </span>
      </div>
      <progress
        className={cn("progress h-1.5 w-full", barClassName)}
        value={current}
        max={total}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${unitLabel} ${current} of ${total}`}
      />
    </div>
  );
}
