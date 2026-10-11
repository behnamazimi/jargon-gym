"use client";

import { ChevronRight, Flame } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { getStreakHistoryAction } from "@/app/(private)/actions";
import { getGoalsSnapshot, subscribeGoals } from "@/components/goals/goal-store";
import { StreakFlameScene } from "@/components/illustrations/scenes/streak-flame";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { goalProgress, goalTiersSet, metCount } from "@/lib/goals/progress";
import type { StreakDay } from "@/lib/streak/history";
import type { StreakSummary } from "@/lib/streak/status";
import { cn } from "@/lib/utils";

type StreakModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  streak: StreakSummary;
  /** Called when the loaded history shows today already has activity. */
  onTodayActive: () => void;
};

/** Parsed as local midnight (not UTC) so the weekday label is stable
 *  regardless of the browser's own timezone offset. */
function weekdayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

export function StreakModal({ isOpen, onOpenChange, streak, onTodayActive }: StreakModalProps) {
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
        if (rows.at(-1)?.isActive) onTodayActive();
      }
    });
  }, [isOpen, hasLoaded, onTodayActive]);

  const selected = days.find((day) => day.date === selectedDate);
  const showSkeleton = isPending && days.length === 0;

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="sr-only">Streak history</DialogTitle>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Flame className="size-6 shrink-0 text-streak" strokeWidth={2} aria-hidden />
            <p className="m-0 text-lg leading-none font-semibold">
              <span className="tabular-nums">{streak.current}</span> day streak
            </p>
          </div>
          <p className="m-0 ml-8 text-xs leading-none text-base-content/70">
            Longest {streak.longest}
          </p>
        </div>
      </DialogHeader>

      <StreakFlameScene
        state={streak.doneToday ? "done" : streak.current > 0 ? "open" : "none"}
        className="mx-auto my-3 max-w-52"
      />

      <div className="flex gap-2">
        {showSkeleton
          ? Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-1 rounded-field bg-base-200/60 py-2"
                aria-hidden
              >
                <span className="h-4 w-6 animate-pulse rounded bg-base-300/60" />
                <span className="size-4 animate-pulse rounded-full bg-base-300/60" />
              </div>
            ))
          : days.map((day, index) => (
              <DayChip
                key={day.date}
                day={day}
                isToday={index === days.length - 1}
                isSelected={day.date === selectedDate}
                onSelect={() => setSelectedDate(day.date)}
              />
            ))}
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-field bg-base-200/60 p-3 text-center">
        <div>
          <p className="text-xl font-semibold tabular-nums">{selected?.readCount ?? 0}</p>
          <p className="text-xs text-base-content/70">Terms read</p>
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums">{selected?.reviewedCount ?? 0}</p>
          <p className="text-xs text-base-content/70">Reviewed</p>
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums">{selected?.quizzedCount ?? 0}</p>
          <p className="text-xs text-base-content/70">Quizzed</p>
        </div>
      </div>

      <p className="m-0 text-xs text-base-content/70">
        A day counts when you read, review or quiz at least one term.
      </p>

      <GoalsRow today={days.at(-1)} onNavigate={() => onOpenChange(false)} />

      {error ? <p className="text-sm text-error-text">{error}</p> : null}
    </Dialog>
  );
}

function DayChip({
  day,
  isToday,
  isSelected,
  onSelect,
}: {
  day: StreakDay;
  isToday: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const label = isToday ? "Today" : weekdayLabel(day.date);
  const status = day.isActive ? "studied" : isToday ? "not yet" : "missed";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${label}: ${status}`}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-field border py-2 text-xs font-medium transition-colors",
        isSelected && "ring-2 ring-primary",
        day.isActive && "border-transparent bg-streak/15 text-base-content",
        !day.isActive && isToday && "border-dashed border-streak/60 text-base-content/80",
        !day.isActive && !isToday && "border-transparent bg-base-200/60 text-base-content/40",
      )}
    >
      <span>{label}</span>
      {day.isActive ? (
        <Flame className="size-4 fill-streak text-streak" strokeWidth={2} aria-hidden />
      ) : isToday ? (
        <Flame className="size-4 text-streak/60" strokeWidth={2} aria-hidden />
      ) : (
        <span className="flex size-4 items-center justify-center" aria-hidden>
          <span className="h-0.5 w-2.5 rounded-full bg-base-content/25" />
        </span>
      )}
    </button>
  );
}

function GoalsRow({ today, onNavigate }: { today?: StreakDay; onNavigate: () => void }) {
  const goals = useSyncExternalStore(
    subscribeGoals,
    () => getGoalsSnapshot()?.goals ?? null,
    () => null,
  );
  const progress = goals
    ? goalProgress(goals, {
        read: today?.readCount ?? 0,
        review: today?.reviewedCount ?? 0,
        quiz: today?.quizzedCount ?? 0,
      })
    : null;
  const total = progress ? goalTiersSet(progress).length : 0;

  return (
    <Link
      href="/app/goals"
      onClick={onNavigate}
      className="flex min-h-11 items-center justify-between gap-3 rounded-field bg-base-200/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-base-200"
    >
      {progress && total > 0 ? (
        <span>
          Today&apos;s goals ·{" "}
          <span className="tabular-nums">
            {metCount(progress)} of {total}
          </span>
        </span>
      ) : (
        <span>Set daily goals</span>
      )}
      <ChevronRight className="size-4 text-base-content/70" aria-hidden />
    </Link>
  );
}
