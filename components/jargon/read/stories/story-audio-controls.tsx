"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useRef, useState } from "react";
import { claimActiveAudio, releaseActiveAudio } from "@/components/jargon/active-audio";
import { Button } from "@/components/ui/button";
import { formatPlaybackTime, nextPlaybackSpeed, parsePlaybackSpeed } from "@/lib/stories/playback";
import { useMountEffect } from "@/hooks/use-mount-effect";

const SKIP_SECONDS = 10;
const SPEED_STORAGE_KEY = "jargon-gym:story-audio-speed:v1";

function loadSpeed(): number {
  try {
    return parsePlaybackSpeed(window.localStorage.getItem(SPEED_STORAGE_KEY));
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
      className="relative size-10 shrink-0 min-[360px]:size-11 md:size-10"
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
  // Only filled in when the user changes speed, so nothing is read out on load.
  const [speedAnnouncement, setSpeedAnnouncement] = useState("");

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
      // Browsers (notably iOS Safari) may block this if preparing the audio
      // took a while after the Listen tap; the Play button still works.
      void audio.play().catch(() => undefined);
    }
    return () => {
      if (audio) {
        audio.pause();
        releaseActiveAudio(audio);
      }
    };
  });

  // Whole seconds, so the 1s steps can reach the end.
  const seekMax = Math.floor(duration);

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
    setSpeedAnnouncement(`Speed ${next}×`);
    saveSpeed(next);
    if (audioRef.current) {
      audioRef.current.defaultPlaybackRate = next;
      audioRef.current.playbackRate = next;
    }
  }

  return (
    <div className="flex items-center gap-0.5 rounded-box bg-base-200/60 py-1 px-1 sm:gap-1">
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
        className="btn-circle size-10 shrink-0 min-[360px]:size-11 md:size-10"
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
        max={seekMax}
        step={1}
        value={Math.floor(Math.min(currentTime, seekMax))}
        disabled={seekMax < 1}
        onChange={(event) => seekTo(Number(event.target.value))}
        className="range range-sm range-primary mx-1.5 min-w-0 flex-1 sm:range-xs"
      />
      <span className="shrink-0 text-xs text-base-content/60 tabular-nums max-[359px]:hidden">
        {formatPlaybackTime(currentTime)}
        <span className="max-sm:hidden"> / {formatPlaybackTime(duration)}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Playback speed ${speed}×`}
        onPress={() => changeSpeed(nextPlaybackSpeed(speed))}
        className="h-10 min-w-10 shrink-0 px-1 text-xs font-semibold tabular-nums min-[360px]:h-11 min-[360px]:min-w-11 md:h-10 md:min-w-10"
      >
        {speed}×
      </Button>
      <span className="sr-only" aria-live="polite">
        {speedAnnouncement}
      </span>
    </div>
  );
}
