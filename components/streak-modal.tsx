"use client";

import { Flame } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { getStreakHistoryAction } from "@/app/(private)/actions";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StreakDay } from "@/lib/streak/history";
import { cn } from "@/lib/utils";

type StreakModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentStreak: number;
  longestStreak: number;
};

/** Parsed as local midnight (not UTC) so the weekday label is stable
 *  regardless of the browser's own timezone offset. */
function weekdayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

export function StreakModal({
  isOpen,
  onOpenChange,
  currentStreak,
  longestStreak,
}: StreakModalProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [days, setDays] = useState<StreakDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) {
      setHasLoaded(false);
      setDays([]);
      setError(null);
      setSelectedDate(null);
      return;
    }
    if (hasLoaded) return;

    setHasLoaded(true);
    startTransition(async () => {
      const result = await getStreakHistoryAction();
      if (result.error) {
        setError(result.error);
      } else {
        const rows = result.days ?? [];
        setDays(rows);
        setSelectedDate(rows.at(-1)?.date ?? null);
      }
    });
  }, [isOpen, hasLoaded]);

  const selected = days.find((day) => day.date === selectedDate);
  const showSkeleton = isPending && days.length === 0;

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="sr-only">Streak history</DialogTitle>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Flame className="size-6 shrink-0 text-streak" strokeWidth={2} aria-hidden />
            <p className="m-0 text-lg leading-none font-bold tracking-tight">
              <span className="tabular-nums">{currentStreak}</span> day streak
            </p>
          </div>
          <p className="m-0 ml-8 text-xs leading-none text-base-content/50">
            Longest {longestStreak}
          </p>
        </div>
      </DialogHeader>

      <div className="flex gap-1.5">
        {showSkeleton
          ? Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-1 rounded-lg bg-base-200/50 py-2"
                aria-hidden
              >
                <span className="h-4 w-6 animate-pulse rounded bg-base-300/70" />
                <span className="size-4 animate-pulse rounded-full bg-base-300/70" />
              </div>
            ))
          : days.map((day) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                aria-pressed={day.date === selectedDate}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors",
                  day.date === selectedDate && "ring-2 ring-primary",
                  day.isActive
                    ? "bg-streak/10 text-base-content"
                    : "bg-base-200/50 text-base-content/40",
                )}
              >
                <span>{weekdayLabel(day.date)}</span>
                <Flame
                  className={cn("size-4", day.isActive ? "text-streak" : "text-base-content/20")}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            ))}
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-base-200/50 p-3 text-center">
        <div>
          <p className="text-xl font-bold tracking-tight tabular-nums">
            {selected?.readCount ?? 0}
          </p>
          <p className="text-xs text-base-content/50">Read</p>
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight tabular-nums">
            {selected?.reviewedCount ?? 0}
          </p>
          <p className="text-xs text-base-content/50">Reviewed</p>
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight tabular-nums">
            {selected?.quizzedCount ?? 0}
          </p>
          <p className="text-xs text-base-content/50">Quizzed</p>
        </div>
      </div>

      {error ? <p className="text-sm text-error">{error}</p> : null}
    </Dialog>
  );
}
