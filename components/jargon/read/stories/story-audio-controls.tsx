"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useRef, useState } from "react";
import { claimActiveAudio, releaseActiveAudio } from "@/components/jargon/active-audio";
import { Button } from "@/components/ui/button";
import { formatPlaybackTime } from "@/lib/stories/feedback";
import { useMountEffect } from "@/hooks/use-mount-effect";

const SKIP_SECONDS = 10;
// The speed button steps through these in order and wraps around.
const SPEEDS = [1, 1.25, 1.5, 0.75] as const;
const SPEED_STORAGE_KEY = "jargon-gym:story-audio-speed:v1";

function loadSpeed(): number {
  try {
    const stored = Number(window.localStorage.getItem(SPEED_STORAGE_KEY));
    return (SPEEDS as readonly number[]).includes(stored) ? stored : 1;
  } catch {
    return 1;
  }
}

function nextSpeed(speed: number): number {
  const index = (SPEEDS as readonly number[]).indexOf(speed);
  return SPEEDS[(index + 1) % SPEEDS.length]!;
}

function SkipButton({
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
      className="relative size-9 shrink-0 sm:size-10"
    >
      <Icon className="size-6" aria-hidden strokeWidth={1.25} />
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pt-px text-[0.5625rem] font-bold tabular-nums"
      >
        {SKIP_SECONDS}
      </span>
    </Button>
  );
}

function saveSpeed(speed: number) {
  try {
    window.localStorage.setItem(SPEED_STORAGE_KEY, String(speed));
  } catch {
    // Ignore storage restrictions; the speed still applies for this story.
  }
}

/** One-line controls for a story's narration: ±10s skips, play/pause, a seek
 *  bar, the time, and a speed button that steps through the speeds. */
export function StoryAudioControls({ src, onError }: { src: string; onError: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Rendered only on the client, once the audio is ready, so reading the
  // saved speed here is safe.
  const [speed, setSpeed] = useState(loadSpeed);

  useMountEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.defaultPlaybackRate = speed;
      audio.playbackRate = speed;
      // Metadata, or a load error, can arrive before React attaches its listeners.
      if (audio.error) {
        onError();
        return;
      }
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      void audio.play().catch(() => undefined);
    }
    return () => {
      if (audio) {
        audio.pause();
        releaseActiveAudio(audio);
      }
    };
  });

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => undefined);
    else audio.pause();
  }

  function skip(seconds: number) {
    const audio = audioRef.current;
    if (audio) seekTo(audio.currentTime + seconds);
  }

  function seekTo(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const end = Number.isFinite(audio.duration) ? audio.duration : seconds;
    audio.currentTime = Math.min(Math.max(seconds, 0), end);
    setCurrentTime(audio.currentTime);
  }

  function changeSpeed(next: number) {
    setSpeed(next);
    saveSpeed(next);
    if (audioRef.current) {
      audioRef.current.defaultPlaybackRate = next;
      audioRef.current.playbackRate = next;
    }
  }

  return (
    <div className="flex items-center gap-0.5 rounded-box bg-base-200/60 py-1 ps-1 pe-1 sm:gap-1">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        className="hidden"
        onError={onError}
        onPlay={(event) => {
          claimActiveAudio(event.currentTarget);
          setPlaying(true);
        }}
        onPause={(event) => {
          releaseActiveAudio(event.currentTarget);
          setPlaying(false);
        }}
        onEnded={(event) => {
          releaseActiveAudio(event.currentTarget);
          setPlaying(false);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onDurationChange={(event) => {
          const { duration: next } = event.currentTarget;
          if (Number.isFinite(next)) setDuration(next);
        }}
      />

      <SkipButton direction="back" onPress={() => skip(-SKIP_SECONDS)} />
      <Button
        type="button"
        size="icon"
        aria-label={playing ? "Pause" : "Play"}
        onPress={togglePlay}
        className="btn-circle size-9 shrink-0 sm:size-10"
      >
        {playing ? (
          <Pause className="size-4 fill-current" aria-hidden strokeWidth={1.5} />
        ) : (
          <Play className="size-4 translate-x-px fill-current" aria-hidden strokeWidth={1.5} />
        )}
      </Button>
      <SkipButton direction="forward" onPress={() => skip(SKIP_SECONDS)} />

      <input
        type="range"
        aria-label="Seek"
        aria-valuetext={`${formatPlaybackTime(currentTime)} of ${formatPlaybackTime(duration)}`}
        min={0}
        max={duration || 0}
        step={1}
        value={Math.min(currentTime, duration || 0)}
        disabled={!duration}
        onChange={(event) => seekTo(Number(event.target.value))}
        className="range range-xs range-primary mx-1.5 min-w-0 flex-1"
      />
      <span className="shrink-0 text-xs text-base-content/60 tabular-nums max-[359px]:hidden">
        {formatPlaybackTime(currentTime)}
        <span className="max-sm:hidden"> / {formatPlaybackTime(duration)}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Playback speed ${speed}×, change speed`}
        onPress={() => changeSpeed(nextSpeed(speed))}
        className="h-9 min-w-10 shrink-0 px-1 text-xs font-semibold tabular-nums sm:h-10"
      >
        {speed}×
      </Button>
    </div>
  );
}
