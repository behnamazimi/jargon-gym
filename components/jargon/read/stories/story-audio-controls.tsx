"use client";

import { Pause, Play } from "lucide-react";
import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { claimActiveAudio, releaseActiveAudio } from "@/components/jargon/active-audio";
import {
  LoopButton,
  PauseCountdown,
  SentenceButton,
  SKIP_SECONDS,
  SkipButton,
} from "@/components/jargon/read/stories/story-audio-buttons";
import {
  loadSavedSpeed,
  saveSpeed,
  StorySpeedControl,
} from "@/components/jargon/read/stories/story-speed-control";
import {
  useShadowingPlayback,
  type ShadowingSetup,
} from "@/components/jargon/read/stories/use-shadowing-playback";
import { Button } from "@/components/ui/button";
import { detectClipPauses } from "@/lib/stories/clip-pauses";
import { formatPlaybackTime } from "@/lib/stories/playback";
import type { ClipPauses } from "@/lib/stories/silence";
import { cn } from "@/lib/utils";
import { useMountEffect } from "@/hooks/use-mount-effect";

/** What the story reader can ask the player to do. */
export type StoryPlayerHandle = { playSentence: (index: number) => void };

/** Slower and faster playback keeps the voice's pitch. */
function applySpeed(audio: HTMLAudioElement, speed: number) {
  audio.defaultPlaybackRate = speed;
  audio.playbackRate = speed;
  audio.preservesPitch = true;
}

/** One-line controls for a story's narration: ±10s skips, play/pause, a seek
 *  bar, the time, and a speed button that steps through the speeds. With
 *  Shadowing on, the skips become previous and next sentence and a loop button
 *  joins the row. */
export function StoryAudioControls({
  src,
  onError,
  onProgress,
  shadowing = null,
  handleRef,
  onClipPauses,
}: {
  src: string;
  onError: () => void;
  /** Where playback is, as a share of the clip; null once it has ended. */
  onProgress?: (fraction: number | null) => void;
  shadowing?: ShadowingSetup | null;
  handleRef?: Ref<StoryPlayerHandle>;
  /** When given, the clip is measured for its pauses and they are passed here. */
  onClipPauses?: (clip: ClipPauses) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Rendered only on the client, once the audio is ready, so reading the
  // saved speed here is safe.
  const [speed, setSpeed] = useState(loadSavedSpeed);
  // Only filled in when the user changes speed, so nothing is read out on load.
  const [speedAnnouncement, setSpeedAnnouncement] = useState("");
  const sentences = useShadowingPlayback({ audioRef, shadowing, speed });

  useImperativeHandle(handleRef, () => ({ playSentence: sentences.pressSentence }), [
    sentences.pressSentence,
  ]);

  useMountEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      applySpeed(audio, speed);
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
    const measuring = new AbortController();
    if (onClipPauses) {
      void detectClipPauses(src, measuring.signal).then((clip) => {
        if (!clip || measuring.signal.aborted) return;
        // The player works in shares of its own length, which a decoder can
        // read a little differently from the audio element.
        const duration = Number.isFinite(audio?.duration) ? audio!.duration : clip.duration;
        onClipPauses({ pauses: clip.pauses, duration });
      });
    }
    return () => {
      measuring.abort();
      sentences.stopWatching();
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
    if (audio.paused) sentences.resume();
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
    sentences.forgetSentence();
    audio.currentTime = Math.min(Math.max(seconds, 0), end);
    setCurrentTime(audio.currentTime);
    reportProgress(audio);
  }

  function reportProgress(audio: HTMLAudioElement) {
    onProgress?.(audio.currentTime / audio.duration);
  }

  function changeSpeed(next: number) {
    setSpeed(next);
    setSpeedAnnouncement(`Speed ${next}×`);
    saveSpeed(next);
    if (audioRef.current) applySpeed(audioRef.current, next);
  }

  return (
    <div className="flex items-center gap-1 rounded-box bg-base-200/60 py-1 px-1 sm:gap-1">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        className="hidden"
        onError={onError}
        onPlay={(event) => {
          claimActiveAudio(event.currentTarget);
          setPlaying(true);
          if (shadowing) sentences.startWatching();
        }}
        onPause={(event) => {
          releaseActiveAudio(event.currentTarget);
          setPlaying(false);
        }}
        onEnded={(event) => {
          releaseActiveAudio(event.currentTarget);
          setPlaying(false);
          if (!sentences.handleEnded()) onProgress?.(null);
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
          reportProgress(event.currentTarget);
        }}
        onDurationChange={(event) => {
          const { duration: next } = event.currentTarget;
          if (Number.isFinite(next)) setDuration(next);
        }}
      />

      {shadowing ? (
        <SentenceButton direction="previous" onPress={sentences.previousSentence} />
      ) : (
        <SkipButton direction="back" onPress={() => skip(-SKIP_SECONDS)} />
      )}
      <Button
        type="button"
        size="icon"
        aria-label={playing ? "Pause" : "Play"}
        onPress={togglePlay}
        className="btn-circle relative size-10 shrink-0 min-[360px]:size-11 md:size-10"
      >
        {playing ? (
          <Pause className="size-4 fill-current" aria-hidden strokeWidth={1.5} />
        ) : (
          <Play className="size-4 translate-x-px fill-current" aria-hidden strokeWidth={1.5} />
        )}
        {sentences.pauseMs === null ? null : <PauseCountdown ms={sentences.pauseMs} />}
      </Button>
      {shadowing ? (
        <SentenceButton direction="next" onPress={sentences.nextSentence} />
      ) : (
        <SkipButton direction="forward" onPress={() => skip(SKIP_SECONDS)} />
      )}
      {shadowing ? (
        <LoopButton
          active={sentences.loop}
          repeats={shadowing.settings.repeats}
          onPress={sentences.toggleLoop}
        />
      ) : null}

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
        className={cn(
          "range range-sm range-primary mx-1.5 min-w-0 flex-1 sm:range-xs",
          shadowing && "max-sm:hidden",
        )}
      />
      <span
        className={cn(
          "shrink-0 text-xs text-base-content/70 tabular-nums max-[359px]:hidden",
          shadowing && "max-sm:flex-1 max-sm:text-center",
        )}
      >
        {formatPlaybackTime(currentTime)}
        <span className="max-sm:hidden"> / {formatPlaybackTime(duration)}</span>
      </span>
      <StorySpeedControl speed={speed} onChange={changeSpeed} />
      <span className="sr-only" aria-live="polite">
        {speedAnnouncement}
      </span>
    </div>
  );
}
