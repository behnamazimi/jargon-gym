"use client";

import { ChevronRight, Flame, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { clearShieldNoticeAction, getStreakHistoryAction } from "@/app/(private)/actions";
import { getGoalsSnapshot, subscribeGoals } from "@/components/goals/goal-store";
import { StreakFlameScene } from "@/components/illustrations/scenes/streak-flame";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GOAL_TIERS } from "@/lib/goals/levels";
import { goalProgress, metCount } from "@/lib/goals/progress";
import type { StreakDay } from "@/lib/streak/history";
import { SHIELD_DAYS, type ShieldSummary, type StreakSummary } from "@/lib/streak/status";
import { cn } from "@/lib/utils";

type StreakModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  streak: StreakSummary;
  /** Called when the loaded history shows today already has activity. */
  onTodayActive: () => void;
  /** Called once the shield message has been shown, so it is not shown again. */
  onNoticeSeen: () => void;
};

/** Parsed as local midnight (not UTC) so the weekday label is stable
 *  regardless of the browser's own timezone offset. */
function weekdayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

export function StreakModal({
  isOpen,
  onOpenChange,
  streak,
  onTodayActive,
  onNoticeSeen,
}: StreakModalProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [days, setDays] = useState<StreakDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [noticeDate, setNoticeDate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) {
      setHasLoaded(false);
      setDays([]);
      setError(null);
      setSelectedDate(null);
      setNoticeDate(null);
      return;
    }
    if (hasLoaded) return;

    setHasLoaded(true);
    const pendingNotice = streak.shield.noticeDate;
    if (pendingNotice) {
      setNoticeDate(pendingNotice);
      onNoticeSeen();
      void clearShieldNoticeAction();
    }
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
  }, [isOpen, hasLoaded, onTodayActive, onNoticeSeen, streak.shield.noticeDate]);

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

      {noticeDate ? (
        <div role="status" className="alert alert-info alert-soft text-sm">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          <span>Your shield covered {weekdayLabel(noticeDate)}. Your streak is safe.</span>
        </div>
      ) : null}

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

      <ShieldLine shield={streak.shield} />

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

type ChipState = "studied" | "shielded" | "not yet" | "missed";

function chipState(day: StreakDay, isToday: boolean): ChipState {
  if (day.isActive) return "studied";
  if (day.isShielded) return "shielded";
  return isToday ? "not yet" : "missed";
}

const CHIP_STYLES: Record<ChipState, string> = {
  studied: "border-transparent bg-streak/15 text-base-content",
  shielded: "border-transparent bg-info/10 text-base-content",
  "not yet": "border-dashed border-streak/60 text-base-content/80",
  missed: "border-transparent bg-base-200/60 text-base-content/40",
};

function ChipIcon({ state }: { state: ChipState }) {
  if (state === "studied") {
    return <Flame className="size-4 fill-streak text-streak" strokeWidth={2} aria-hidden />;
  }
  if (state === "shielded") {
    return <ShieldCheck className="size-4 text-info" strokeWidth={2} aria-hidden />;
  }
  if (state === "not yet") {
    return <Flame className="size-4 text-streak/60" strokeWidth={2} aria-hidden />;
  }
  return (
    <span className="flex size-4 items-center justify-center" aria-hidden>
      <span className="h-0.5 w-2.5 rounded-full bg-base-content/25" />
    </span>
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
  const state = chipState(day, isToday);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${label}: ${state}`}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-field border py-2 text-xs font-medium transition-colors",
        isSelected && "ring-2 ring-primary",
        CHIP_STYLES[state],
      )}
    >
      <span>{label}</span>
      <ChipIcon state={state} />
    </button>
  );
}

function ShieldLine({ shield }: { shield: ShieldSummary }) {
  const text = shield.inUse
    ? "Your shield is covering yesterday. Study today to keep your streak."
    : shield.ready
      ? "Shield ready: one missed day won't break your streak."
      : `${shield.progress}/${SHIELD_DAYS} active days to your next shield.`;

  return (
    <p className="m-0 flex items-center gap-2 text-xs text-base-content/70">
      <ShieldCheck className="size-4 shrink-0 text-info" aria-hidden />
      {text}
    </p>
  );
}

function GoalsRow({ today, onNavigate }: { today?: StreakDay; onNavigate: () => void }) {
  const live = useSyncExternalStore(subscribeGoals, getGoalsSnapshot, () => null);
  const goals = live?.goals ?? null;
  // A tier met by running out of terms is only known from the celebrations.
  const celebrated = today && live?.day.date === today.date ? live.day.celebrated : [];
  const progress =
    goals && today
      ? goalProgress(
          goals,
          { read: today.readCount, review: today.reviewedCount, quiz: today.quizzedCount },
          celebrated,
        )
      : null;
  const total = goals ? GOAL_TIERS.filter((tier) => goals[tier] !== null).length : 0;

  return (
    <Link
      href="/app/goals"
      onClick={onNavigate}
      className="flex min-h-11 items-center justify-between gap-3 rounded-field bg-base-200/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-base-200"
    >
      {total > 0 ? (
        <span>
          Today&apos;s goals
          {progress ? (
            <span className="tabular-nums">
              {" "}
              · {metCount(progress)} of {total}
            </span>
          ) : null}
        </span>
      ) : (
        <span>Set daily goals</span>
      )}
      <ChevronRight className="size-4 text-base-content/70" aria-hidden />
    </Link>
  );
}
