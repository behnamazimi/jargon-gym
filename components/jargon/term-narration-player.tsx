"use client";

import { Loader2, Pause, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";

/**
 * Only one narration clip should play at a time — the jargon collection
 * page renders many TermNarrationPlayer instances at once, and starting a
 * new one should pause whichever was previously playing (simultaneous
 * fetches/loads are fine; simultaneous *playback* is not). A module-level
 * singleton coordinates this across every independent instance.
 *
 * `previous.pause()` fires a 'pause' event asynchronously, so `active` is
 * reassigned before that fires — by the time the paused instance's own
 * onpause handler runs, `active` already points elsewhere, so it correctly
 * treats that pause as "someone else took the slot" instead of a load glitch.
 */
let activeAudio: HTMLAudioElement | null = null;

function claimActiveAudio(audio: HTMLAudioElement) {
  const previous = activeAudio;
  activeAudio = audio;
  if (previous && previous !== audio) previous.pause();
}

function releaseActiveAudio(audio: HTMLAudioElement) {
  if (activeAudio === audio) activeAudio = null;
}

function narrationSrc(termId: string): string {
  return new URL(`/api/narration/${termId}`, window.location.origin).href;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Play/pause button for a term's narration. Shared by Read, Review, and the
 *  jargon collection page — callers should only render it when
 *  narrationAccess is true, but access is re-checked server-side regardless
 *  by GET /api/narration/[termId], which streams the audio itself.
 *
 *  That route sets Cache-Control + an ETag (the narration's content hash),
 *  so repeat plays of the same term are served from the browser's own HTTP
 *  cache — no bespoke caching logic needed here. */
export function TermNarrationPlayer({ termId }: { termId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wantPlayingRef = useRef(false);
  const abortRetriesRef = useRef(0);

  useMountEffect(() => {
    return () => {
      wantPlayingRef.current = false;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        releaseActiveAudio(audio);
      }
    };
  });

  function playClip(audio: HTMLAudioElement) {
    return audio
      .play()
      .then(() => {
        if (wantPlayingRef.current) setStatus("playing");
      })
      .catch((error: unknown) => {
        // Setting src and calling play() in the same tap often rejects with
        // AbortError ("interrupted by a new load request"). Stay on loading
        // and retry once the element can play — bouncing to idle made the
        // first tap look like a no-op.
        if (isAbortError(error) && wantPlayingRef.current && abortRetriesRef.current < 1) {
          abortRetriesRef.current += 1;
          const retry = () => {
            if (wantPlayingRef.current) void playClip(audio);
          };
          if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) retry();
          else audio.addEventListener("canplay", retry, { once: true });
          return;
        }
        wantPlayingRef.current = false;
        releaseActiveAudio(audio);
        setStatus("idle");
      });
  }

  function handlePress() {
    const audio = audioRef.current;
    if (!audio) return;

    if (status === "playing") {
      wantPlayingRef.current = false;
      audio.pause();
      return;
    }

    abortRetriesRef.current = 0;
    wantPlayingRef.current = true;
    const src = narrationSrc(termId);
    const needsLoad = audio.src !== src || audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA;
    if (audio.src !== src) audio.src = src;

    claimActiveAudio(audio);
    setStatus(needsLoad ? "loading" : "playing");
    void playClip(audio);
  }

  function handlePause() {
    const audio = audioRef.current;
    if (!audio || audio.ended) return;
    // A load abort fires pause while we still intend to play. Ignore that;
    // playClip retries. A real pause is the user, or another player claiming
    // the slot (activeAudio already points elsewhere by then).
    if (wantPlayingRef.current && activeAudio === audio) return;
    wantPlayingRef.current = false;
    releaseActiveAudio(audio);
    setStatus("paused");
  }

  function handleEnded() {
    wantPlayingRef.current = false;
    const audio = audioRef.current;
    if (audio) releaseActiveAudio(audio);
    setStatus("idle");
  }

  function handleError() {
    wantPlayingRef.current = false;
    const audio = audioRef.current;
    if (audio) releaseActiveAudio(audio);
    setStatus("idle");
  }

  return (
    <span className="inline-flex">
      <audio
        ref={audioRef}
        hidden
        preload="none"
        onEnded={handleEnded}
        onError={handleError}
        onPause={handlePause}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onPress={handlePress}
        isDisabled={status === "loading"}
        aria-label={status === "playing" ? "Pause narration" : "Play narration"}
      >
        {status === "loading" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden strokeWidth={1.5} />
        ) : status === "playing" ? (
          <Pause className="size-4" aria-hidden strokeWidth={1.5} />
        ) : (
          <Volume2 className="size-4" aria-hidden strokeWidth={1.5} />
        )}
      </Button>
    </span>
  );
}
