"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Popover } from "react-aria-components";
import { Button } from "@/components/ui/button";
import {
  clampPlaybackSpeed,
  formatPlaybackSpeed,
  MAX_PLAYBACK_SPEED,
  MIN_PLAYBACK_SPEED,
  nextPlaybackSpeed,
  parsePlaybackSpeed,
  PLAYBACK_SPEED_STEP,
} from "@/lib/stories/playback";

const SPEED_STORAGE_KEY = "lobyas:story-audio-speed:v1";
const LONG_PRESS_MS = 450;

export function loadSavedSpeed(): number {
  try {
    return parsePlaybackSpeed(window.localStorage.getItem(SPEED_STORAGE_KEY));
  } catch {
    return 1;
  }
}

export function saveSpeed(speed: number) {
  try {
    window.localStorage.setItem(SPEED_STORAGE_KEY, String(speed));
  } catch {
    // Ignore storage restrictions; the speed still applies for this story.
  }
}

/** The speed button: a tap steps through the usual speeds, a long press (or the
 *  up and down arrow keys) opens a slider for any speed from 0.5× to 1.5×. */
export function StorySpeedControl({
  speed,
  onChange,
}: {
  speed: number;
  onChange: (speed: number) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const [sliderOpen, setSliderOpen] = useState(false);

  function cancelLongPress() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }

  function startLongPress() {
    longPressed.current = false;
    cancelLongPress();
    timer.current = setTimeout(() => {
      longPressed.current = true;
      setSliderOpen(true);
    }, LONG_PRESS_MS);
  }

  function handlePress() {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onChange(nextPlaybackSpeed(speed));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const direction = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
    if (direction === 0) return;
    event.preventDefault();
    onChange(clampPlaybackSpeed(speed + direction * PLAYBACK_SPEED_STEP));
  }

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Playback speed ${formatPlaybackSpeed(speed)}. Hold or use the arrow keys to fine tune.`}
        onPress={handlePress}
        onPressStart={(event) => {
          if (event.pointerType !== "keyboard") startLongPress();
        }}
        onPressEnd={cancelLongPress}
        onKeyDown={handleKeyDown}
        onContextMenu={(event) => event.preventDefault()}
        className="h-10 min-w-10 shrink-0 touch-none px-1 text-xs font-semibold tabular-nums select-none min-[360px]:h-11 min-[360px]:min-w-11 md:h-10 md:min-w-10"
      >
        {formatPlaybackSpeed(speed)}
      </Button>
      <Popover
        triggerRef={buttonRef}
        isOpen={sliderOpen}
        onOpenChange={setSliderOpen}
        placement="bottom"
        offset={6}
        className="z-50 flex w-14 flex-col items-center gap-2 rounded-box bg-base-100 py-3 shadow-lg ring-1 ring-base-content/10"
      >
        <span className="w-full text-center text-xs font-semibold tabular-nums">
          {formatPlaybackSpeed(speed)}
        </span>
        <input
          type="range"
          aria-label="Playback speed"
          min={MIN_PLAYBACK_SPEED}
          max={MAX_PLAYBACK_SPEED}
          step={PLAYBACK_SPEED_STEP}
          value={speed}
          onChange={(event) => onChange(clampPlaybackSpeed(Number(event.target.value)))}
          className="m-0 cursor-pointer accent-primary"
          style={{ writingMode: "vertical-lr", direction: "rtl", width: "1.5rem", height: "9rem" }}
        />
      </Popover>
    </>
  );
}
