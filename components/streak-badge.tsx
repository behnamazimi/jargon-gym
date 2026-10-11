"use client";

import { Flame } from "lucide-react";
import { useState } from "react";
import { StreakModal } from "@/components/streak-modal";
import { type StreakSummary, withTodayDone } from "@/lib/streak/status";
import { cn } from "@/lib/utils";

/** Daily streak indicator in the header and the phone top bar. The flame is
 *  filled once today counts, an outline while today is still open, and the
 *  whole badge dims when there is no streak. Opens the streak modal. */
export function StreakBadge({
  streak: initialStreak,
  className,
}: {
  streak: StreakSummary;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  // The header isn't re-rendered after studying, so the history the modal
  // loads can show today already counts.
  const [todaySeenActive, setTodaySeenActive] = useState(false);
  const streak = todaySeenActive ? withTodayDone(initialStreak) : initialStreak;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "btn btn-ghost min-h-11 gap-2 md:min-h-0",
          streak.current === 0 && "opacity-50",
          className,
        )}
        aria-label={`${streak.current} day streak. View streak history.`}
        data-tour="app-streak"
        data-streak-today={streak.doneToday ? "done" : "open"}
      >
        <Flame
          className={cn("size-4.5 text-streak", streak.doneToday && "fill-streak")}
          strokeWidth={2}
          aria-hidden
        />
        <span className="text-sm leading-none font-semibold tabular-nums">{streak.current}</span>
      </button>
      <StreakModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        streak={streak}
        onTodayActive={() => setTodaySeenActive(true)}
      />
    </>
  );
}
