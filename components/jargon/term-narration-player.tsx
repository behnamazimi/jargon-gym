"use client";

import { Loader2, Pause, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  claimActiveAudio,
  isActiveAudio,
  releaseActiveAudio,
} from "@/components/jargon/active-audio";
import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";

function narrationSrc(termId: string): string {
  return `/api/narration/${termId}`;
}

function srcMatches(audio: HTMLAudioElement, src: string): boolean {
  const attr = audio.getAttribute("src");
  if (attr === src) return true;
  if (!audio.src) return false;
  return audio.src === new URL(src, document.baseURI).href;
}

function canPlayThrough(audio: HTMLAudioElement): boolean {
  return audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;
}

/** Play/pause button for a term's narration. Shared by Read, Review, and the
 *  jargon collection page — callers should only render it when
 *  narrationAccess is true, but access is re-checked server-side regardless
 *  by GET /api/narration/[termId], which streams the audio itself.
 *
 *  That route sets Cache-Control + an ETag (the narration's content hash),
 *  so repeat plays of the same term are served from the browser's own HTTP
 *  cache — no bespoke caching logic needed here.
 *
 *  `preload` assigns src on mount so Read/Review can buffer the current
 *  term (including the masked face) before the speaker tap. Jargon leaves
 *  it off so a collection list does not fetch every clip. `play()` never
 *  runs in the same tick as setting src — that pairing AbortErrors and
 *  made the first tap look like a no-op. */
export function TermNarrationPlayer({
  termId,
  preload = false,
  showButton = true,
}: {
  termId: string;
  preload?: boolean;
  showButton?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wantPlayingRef = useRef(false);
  const src = narrationSrc(termId);

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
      .catch(() => {
        wantPlayingRef.current = false;
        releaseActiveAudio(audio);
        setStatus("idle");
      });
  }

  function startWhenReady(audio: HTMLAudioElement) {
    const start = () => {
      if (wantPlayingRef.current) void playClip(audio);
    };
    if (canPlayThrough(audio)) start();
    else audio.addEventListener("canplay", start, { once: true });
  }

  function handlePress() {
    const audio = audioRef.current;
    if (!audio) return;

    if (status === "playing") {
      wantPlayingRef.current = false;
      audio.pause();
      return;
    }

    wantPlayingRef.current = true;
    const alreadySet = srcMatches(audio, src);
    const ready = alreadySet && canPlayThrough(audio);
    if (!alreadySet) audio.src = src;

    claimActiveAudio(audio);

    if (ready) {
      setStatus("playing");
      void playClip(audio);
      return;
    }

    setStatus("loading");
    startWhenReady(audio);
  }

  function handlePause() {
    const audio = audioRef.current;
    if (!audio || audio.ended) return;
    // A load can fire pause while we still intend to play (waiting on
    // canplay). Ignore that; startWhenReady will call play(). A real pause
    // is the user, or another player claiming the slot.
    if (wantPlayingRef.current && isActiveAudio(audio)) return;
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
        src={preload ? src : undefined}
        preload={preload ? "auto" : "none"}
        onEnded={handleEnded}
        onError={handleError}
        onPause={handlePause}
      />
      {showButton ? (
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
      ) : null}
    </span>
  );
}
