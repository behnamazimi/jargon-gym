import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** Daily streak indicator: dimmed at 0, warm once active. Shared by the desktop header and the mobile study top bar. */
export function StreakBadge({
  currentStreak,
  className,
}: {
  currentStreak: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "badge badge-sm gap-1 font-normal",
        currentStreak > 0 ? "badge-soft badge-warning" : "badge-soft badge-neutral opacity-50",
        className,
      )}
      aria-label={`${currentStreak} day streak`}
    >
      <Flame className="size-3.5" strokeWidth={2} aria-hidden />
      {currentStreak}
    </span>
  );
}
