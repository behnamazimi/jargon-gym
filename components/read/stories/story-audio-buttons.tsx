"use client";

import { Repeat, RotateCcw, RotateCw, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const SKIP_SECONDS = 10;
const ROW_BUTTON = "relative size-10 shrink-0 min-[360px]:size-11 md:size-10";

export function SkipButton({
  direction,
  onPress,
}: {
  direction: "back" | "forward";
  onPress: () => void;
}) {
  const Icon = direction === "back" ? RotateCcw : RotateCw;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`${direction === "back" ? "Back" : "Forward"} ${SKIP_SECONDS} seconds`}
      onPress={onPress}
      className={ROW_BUTTON}
    >
      <Icon className="size-6" aria-hidden strokeWidth={1.25} />
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pt-px text-[0.5625rem] font-semibold tabular-nums"
      >
        {SKIP_SECONDS}
      </span>
    </Button>
  );
}

export function SentenceButton({
  direction,
  onPress,
}: {
  direction: "previous" | "next";
  onPress: () => void;
}) {
  const Icon = direction === "previous" ? SkipBack : SkipForward;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`${direction === "previous" ? "Previous" : "Next"} sentence`}
      onPress={onPress}
      className={ROW_BUTTON}
    >
      <Icon className="size-5" aria-hidden strokeWidth={1.5} />
    </Button>
  );
}

/** A ring that empties over the pause after a sentence, so it is clear the
 *  narration will pick up again by itself. */
export function PauseCountdown({ ms }: { ms: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 36 36"
      className="pointer-events-none absolute inset-0 size-full -rotate-90"
    >
      <circle
        cx="18"
        cy="18"
        r="16.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray="100"
        className="shadowing-countdown text-primary-content"
        style={{ animationDuration: `${ms}ms` }}
      />
    </svg>
  );
}

/** Repeats the current sentence. While it is on, the number of plays shows in
 *  the middle of the icon; 0 means it plays until it is turned off. */
export function LoopButton({
  active,
  repeats,
  onPress,
}: {
  active: boolean;
  repeats: number;
  onPress: () => void;
}) {
  const endless = repeats === 0;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={
        active
          ? `Repeat sentence, ${endless ? "until turned off" : `${repeats} plays`}`
          : "Repeat sentence"
      }
      aria-pressed={active}
      onPress={onPress}
      className={cn(ROW_BUTTON, active && "bg-primary/15 text-primary")}
    >
      <Repeat className="size-6" aria-hidden strokeWidth={1.25} />
      {active ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 flex items-center justify-center font-semibold tabular-nums",
            endless ? "text-xs" : "pt-px text-[0.5625rem]",
          )}
        >
          {endless ? "∞" : repeats}
        </span>
      ) : null}
    </Button>
  );
}
