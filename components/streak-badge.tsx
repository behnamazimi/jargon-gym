"use client";

import { Flame } from "lucide-react";
import { useState } from "react";
import { StreakModal } from "@/components/streak-modal";
import { cn } from "@/lib/utils";

/** Daily streak indicator: dimmed at 0, warm once active. Icon + number
 *  side by side in a ghost nav button, matching the header's other
 *  btn-ghost controls (ThemeToggle). Shared by the desktop header and the
 *  mobile study top bar. Opens the streak modal (current/longest streak +
 *  a 7-day read/reviewed/quizzed breakdown). */
export function StreakBadge({
  currentStreak,
  longestStreak,
  className,
}: {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn("btn btn-ghost gap-1.5", currentStreak === 0 && "opacity-50", className)}
        aria-label={`${currentStreak} day streak. View streak history.`}
      >
        <Flame className="size-4.5 text-streak" strokeWidth={2} aria-hidden />
        <span className="text-sm leading-none font-semibold tabular-nums">{currentStreak}</span>
      </button>
      <StreakModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        currentStreak={currentStreak}
        longestStreak={longestStreak}
      />
    </>
  );
}
