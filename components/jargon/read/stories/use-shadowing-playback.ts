"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import {
  sentenceAtFraction,
  sentenceBounds,
  sentenceRegion,
  type StoryTimeline,
} from "@/lib/stories/highlight";
import {
  previousSentenceIndex,
  stepAtSentenceEnd,
  type ShadowingSettings,
} from "@/lib/stories/shadowing";

export type ShadowingSetup = { timeline: StoryTimeline; settings: ShadowingSettings };

/** The audio is a hair short of a sentence's end when it is judged finished,
 *  so a frame that lands late still catches it. */
const END_MARGIN_SECONDS = 0.04;
/** Browsers round a seek to the nearest audio frame, which can land a little
 *  before the sentence and highlight the one before it. Only needed while a
 *  sentence starts exactly where the one before it is highlighted; once the
 *  clip's pauses are known, it starts well inside its own stretch. */
const SEEK_PAD_SECONDS = 0.05;
/** Pausing at the end of what a sentence says leaves the playhead in the quiet
 *  before the next one. That counts as being in the next sentence unless it is
 *  further from it than this. */
const START_TOLERANCE_SECONDS = 1;
/** A frame this far past the end still counts as the sentence ending, not a seek. */
const LATE_FRAME_SECONDS = 0.5;

type Watched = { index: number; plays: number };

/** The sentence being followed at this point in the clip. It stays the same
 *  while the playhead is in it (or just past its end, a late frame); anywhere
 *  else the listener has moved, so it is picked afresh from the clip. */
function followSentence(
  timeline: StoryTimeline,
  following: Watched | null,
  fraction: number,
  duration: number,
): Watched | null {
  const region = following ? sentenceRegion(timeline, following.index) : null;
  if (following && region) {
    const earlyBy = (region.start - fraction) * duration;
    const lateBy = (fraction - region.end) * duration;
    if (earlyBy <= START_TOLERANCE_SECONDS && lateBy <= LATE_FRAME_SECONDS) return following;
  }
  const index = sentenceAtFraction(timeline, fraction);
  return index === null ? null : { index, plays: 0 };
}

/** Where in the clip, in seconds, a sentence is played from. */
function replayFrom(timeline: StoryTimeline, index: number, duration: number): number {
  const spoken = sentenceBounds(timeline, index);
  const region = sentenceRegion(timeline, index);
  if (!spoken || !region) return 0;
  const startsAtItsRegion = spoken.start - region.start < 1e-6;
  return spoken.start * duration + (startsAtItsRegion ? SEEK_PAD_SECONDS : 0);
}

/** Sentence-by-sentence playback for Shadowing: pauses after each sentence,
 *  repeats a looped one, and jumps to a chosen one. The narration has no real
 *  timings, so everything here follows the estimates in lib/stories/highlight.ts. */
export function useShadowingPlayback({
  audioRef,
  shadowing,
  speed,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
  shadowing: ShadowingSetup | null;
  speed: number;
}) {
  const [loop, setLoop] = useState(false);
  // Set while waiting out the pause after a sentence, to show the countdown.
  const [pauseMs, setPauseMs] = useState<number | null>(null);

  const latest = useRef({ shadowing, speed, loop });
  latest.current = { shadowing, speed, loop };
  const watched = useRef<Watched | null>(null);
  const frame = useRef(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The sentence just heard while the pause runs, for previous and next.
  const heardDuringPause = useRef<number | null>(null);

  const clearPause = useCallback(() => {
    if (resumeTimer.current !== null) clearTimeout(resumeTimer.current);
    resumeTimer.current = null;
    heardDuringPause.current = null;
    setPauseMs(null);
  }, []);

  const resume = useCallback(() => {
    clearPause();
    void audioRef.current?.play().catch(() => undefined);
  }, [audioRef, clearPause]);

  /** Applies the rules for a sentence that has just been spoken. Returns
   *  whether to keep watching the clip. */
  const handleSentenceEnd = useCallback(
    (audio: HTMLAudioElement, current: Watched, bounds: { start: number; end: number }) => {
      const { shadowing: setup, speed: rate, loop: looping } = latest.current;
      if (!setup) return false;
      const step = stepAtSentenceEnd({
        settings: setup.settings,
        loop: looping,
        playsDone: current.plays + 1,
        isLast: current.index === setup.timeline.ends.length - 1,
        sentenceSeconds: (bounds.end - bounds.start) * audio.duration,
        speed: rate,
      });
      if (step.type === "finish") return false;

      const repeating = step.type === "repeat";
      watched.current = repeating
        ? { index: current.index, plays: current.plays + 1 }
        : { index: current.index + 1, plays: 0 };
      if (repeating) audio.currentTime = replayFrom(setup.timeline, current.index, audio.duration);
      if (step.gapMs > 0) {
        audio.pause();
        heardDuringPause.current = current.index;
        setPauseMs(step.gapMs);
        resumeTimer.current = setTimeout(resume, step.gapMs);
      } else if (audio.paused) {
        void audio.play().catch(() => undefined);
      }
      return true;
    },
    [resume],
  );

  const tick = useCallback(() => {
    const audio = audioRef.current;
    const setup = latest.current.shadowing;
    if (!audio || !setup || audio.paused) return;
    // Playing can start before the clip's length is known.
    if (!Number.isFinite(audio.duration)) {
      frame.current = requestAnimationFrame(tick);
      return;
    }

    const fraction = audio.currentTime / audio.duration;
    const current = followSentence(setup.timeline, watched.current, fraction, audio.duration);
    watched.current = current;
    const bounds = current ? sentenceBounds(setup.timeline, current.index) : null;

    if (current && bounds) {
      const secondsLeft = (bounds.end - fraction) * audio.duration;
      if (secondsLeft <= END_MARGIN_SECONDS && !handleSentenceEnd(audio, current, bounds)) return;
    }
    frame.current = requestAnimationFrame(tick);
  }, [audioRef, handleSentenceEnd]);

  /** The clip ran out. The last sentence can end before a frame catches it,
   *  so the rules for a finished sentence apply here too. Returns whether the
   *  sentence is going to play again. */
  const handleEnded = useCallback(() => {
    const audio = audioRef.current;
    const setup = latest.current.shadowing;
    const current = watched.current;
    if (!audio || !setup || !current) return false;
    if (current.index !== setup.timeline.ends.length - 1) return false;
    const bounds = sentenceBounds(setup.timeline, current.index);
    return bounds ? handleSentenceEnd(audio, current, bounds) : false;
  }, [audioRef, handleSentenceEnd]);

  const startWatching = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopWatching = useCallback(() => {
    cancelAnimationFrame(frame.current);
    if (resumeTimer.current !== null) clearTimeout(resumeTimer.current);
    resumeTimer.current = null;
  }, []);

  /** The listener moved the playhead themselves, so follow the clip afresh. */
  const forgetSentence = useCallback(() => {
    watched.current = null;
    clearPause();
  }, [clearPause]);

  const playSentence = useCallback(
    (index: number) => {
      const audio = audioRef.current;
      const setup = latest.current.shadowing;
      if (!audio || !setup || !sentenceBounds(setup.timeline, index)) return;
      if (!Number.isFinite(audio.duration)) return;
      clearPause();
      watched.current = { index, plays: 0 };
      audio.currentTime = replayFrom(setup.timeline, index, audio.duration);
      void audio.play().catch(() => undefined);
      startWatching();
    },
    [audioRef, clearPause, startWatching],
  );

  /** The sentence being spoken, or the one just heard while the pause runs. */
  const sentenceNow = useCallback((): { index: number | null; secondsIn: number } => {
    const audio = audioRef.current;
    const setup = latest.current.shadowing;
    if (!audio || !setup || !Number.isFinite(audio.duration)) return { index: null, secondsIn: 0 };
    const index =
      heardDuringPause.current ??
      sentenceAtFraction(setup.timeline, audio.currentTime / audio.duration);
    const bounds = index === null ? null : sentenceBounds(setup.timeline, index);
    const secondsIn = bounds ? audio.currentTime - bounds.start * audio.duration : 0;
    return { index, secondsIn: heardDuringPause.current === null ? secondsIn : Infinity };
  }, [audioRef]);

  const previousSentence = useCallback(() => {
    const { index, secondsIn } = sentenceNow();
    playSentence(previousSentenceIndex(index, secondsIn));
  }, [playSentence, sentenceNow]);

  const nextSentence = useCallback(() => {
    const setup = latest.current.shadowing;
    if (!setup) return;
    const { index } = sentenceNow();
    const target = index === null ? 0 : index + 1;
    if (target < setup.timeline.ends.length) playSentence(target);
  }, [playSentence, sentenceNow]);

  return {
    loop,
    toggleLoop: () => setLoop((current) => !current),
    pauseMs,
    resume,
    handleEnded,
    startWatching,
    stopWatching,
    forgetSentence,
    playSentence,
    previousSentence,
    nextSentence,
  };
}
