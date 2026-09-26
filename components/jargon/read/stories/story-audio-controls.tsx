"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useRef, useState } from "react";
import { claimActiveAudio, releaseActiveAudio } from "@/components/jargon/active-audio";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatPlaybackTime } from "@/lib/stories/feedback";
import { useMountEffect } from "@/hooks/use-mount-effect";

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

/** Custom controls for a story's narration: big play/pause, ±10s skips, a
 *  seek bar, and always-visible speed chips sized for thumbs. */
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
        onError={onError}
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
          onPress={() => skip(-SKIP_SECONDS)}
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
          onPress={() => skip(SKIP_SECONDS)}
          className="size-11"
        >
          <RotateCw className="size-5" aria-hidden strokeWidth={1.5} />
        </Button>
        <span className="ms-auto text-xs text-base-content/60 tabular-nums">
          {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
        </span>
      </div>

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
        className="range range-sm range-primary my-2.5 w-full md:range-xs md:my-0"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-base-content/60">Speed</span>
        <ToggleGroup
          aria-label="Playback speed"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={new Set([String(speed)])}
          onSelectionChange={(keys) => {
            const next = Number(keys.values().next().value);
            if ((SPEEDS as readonly number[]).includes(next)) changeSpeed(next);
          }}
          size="sm"
        >
          {SPEEDS.map((option) => (
            <ToggleGroupItem
              key={option}
              id={String(option)}
              className="min-h-11 min-w-12 px-2 text-xs tabular-nums data-selected:bg-primary/15 data-selected:text-primary md:min-h-8"
            >
              {option}×
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
