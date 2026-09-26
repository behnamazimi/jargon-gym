"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useRef, useState } from "react";
import { claimActiveAudio, releaseActiveAudio } from "@/components/jargon/active-audio";
import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";

const SKIP_SECONDS = 10;
const SPEEDS = [0.75, 1, 1.25, 1.5] as const;
const SPEED_STORAGE_KEY = "jargon-gym:story-audio-speed:v1";

function loadSpeed(): number {
  try {
    const stored = Number(window.localStorage.getItem(SPEED_STORAGE_KEY));
    return (SPEEDS as readonly number[]).includes(stored) ? stored : 1;
  } catch {
    return 1;
  }
}

function saveSpeed(speed: number) {
  try {
    window.localStorage.setItem(SPEED_STORAGE_KEY, String(speed));
  } catch {
    // Ignore storage restrictions; the speed still applies for this story.
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** Custom controls for a story's narration: big play/pause, ±10s skips, a
 *  seek bar, and always-visible speed chips sized for thumbs. */
export function StoryAudioControls({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useMountEffect(() => {
    const audio = audioRef.current;
    const initialSpeed = loadSpeed();
    setSpeed(initialSpeed);
    if (audio) {
      audio.defaultPlaybackRate = initialSpeed;
      audio.playbackRate = initialSpeed;
      // Metadata can load before React attaches its listeners.
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
    <div className="space-y-2 rounded-box bg-base-200/60 p-3">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        className="hidden"
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

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Back ${SKIP_SECONDS} seconds`}
          onPress={() => seekTo(currentTime - SKIP_SECONDS)}
          className="size-11"
        >
          <RotateCcw className="size-5" aria-hidden strokeWidth={1.5} />
        </Button>
        <Button
          type="button"
          size="icon"
          aria-label={playing ? "Pause" : "Play"}
          onPress={togglePlay}
          className="btn-circle size-12"
        >
          {playing ? (
            <Pause className="size-5 fill-current" aria-hidden strokeWidth={1.5} />
          ) : (
            <Play className="size-5 translate-x-px fill-current" aria-hidden strokeWidth={1.5} />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Forward ${SKIP_SECONDS} seconds`}
          onPress={() => seekTo(currentTime + SKIP_SECONDS)}
          className="size-11"
        >
          <RotateCw className="size-5" aria-hidden strokeWidth={1.5} />
        </Button>
        <span className="ms-auto text-xs text-base-content/60 tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={(event) => seekTo(Number(event.target.value))}
        className="range range-xs range-primary w-full"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-base-content/60">Speed</span>
        <div className="join" role="group" aria-label="Playback speed">
          {SPEEDS.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={speed === option}
              onPress={() => changeSpeed(option)}
              className={cn(
                "join-item min-h-11 min-w-12 px-2 text-xs tabular-nums md:min-h-8",
                speed === option && "bg-primary/15 text-primary",
              )}
            >
              {option}×
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
