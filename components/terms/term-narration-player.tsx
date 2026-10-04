"use client";

import { Loader2, Pause, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  claimActiveAudio,
  isActiveAudio,
  releaseActiveAudio,
} from "@/components/shared/active-audio";
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

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Play/pause for one term. `preload` buffers the clip before the tap;
 *  the collection list leaves it off so it does not fetch every term. */
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
  const abortRetriedRef = useRef(false);
  const prepareRef = useRef<"idle" | "running" | "done">("idle");
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

  function giveUp(audio: HTMLAudioElement) {
    wantPlayingRef.current = false;
    releaseActiveAudio(audio);
    setStatus("idle");
  }

  // Loading never generates audio. When the clip is not cached yet, ask the
  // server to make it once, then load it again.
  async function prepareThenPlay(audio: HTMLAudioElement) {
    // An error event and a rejected play() can both land for one failed load.
    if (prepareRef.current === "running") return;
    if (prepareRef.current === "done") {
      giveUp(audio);
      return;
    }
    prepareRef.current = "running";
    setStatus("loading");
    try {
      const response = await fetch(src, { method: "POST" });
      if (!response.ok) {
        prepareRef.current = "done";
        giveUp(audio);
        return;
      }
    } catch {
      prepareRef.current = "done";
      giveUp(audio);
      return;
    }
    prepareRef.current = "done";
    if (!wantPlayingRef.current) return;
    abortRetriedRef.current = false;
    audio.src = src;
    audio.load();
    void playClip(audio);
  }

  function playClip(audio: HTMLAudioElement) {
    return audio
      .play()
      .then(() => {
        if (wantPlayingRef.current) setStatus("playing");
      })
      .catch((error: unknown) => {
        // preload "none" never fires canplay unless something asks it to load.
        if (isAbortError(error) && wantPlayingRef.current && !abortRetriedRef.current) {
          abortRetriedRef.current = true;
          const retry = () => {
            if (wantPlayingRef.current && audio.paused) void playClip(audio);
          };
          if (canPlayThrough(audio)) retry();
          else {
            audio.addEventListener("canplay", retry, { once: true });
            audio.load();
          }
          return;
        }
        if (wantPlayingRef.current) void prepareThenPlay(audio);
        else giveUp(audio);
      });
  }

  function startWhenReady(audio: HTMLAudioElement) {
    const start = () => {
      if (wantPlayingRef.current && audio.paused) void playClip(audio);
    };
    if (canPlayThrough(audio)) {
      start();
      return;
    }
    // play() in the same turn as assigning src is aborted by that load.
    queueMicrotask(start);
  }

  function handlePress() {
    const audio = audioRef.current;
    if (!audio) return;

    if (status === "playing") {
      wantPlayingRef.current = false;
      audio.pause();
      return;
    }

    abortRetriedRef.current = false;
    prepareRef.current = "idle";
    wantPlayingRef.current = true;
    const alreadySet = srcMatches(audio, src);
    const ready = alreadySet && canPlayThrough(audio);
    if (!alreadySet) audio.src = src;

    claimActiveAudio(audio);

    // A preload that already failed will not retry on its own.
    if (audio.error) {
      void prepareThenPlay(audio);
      return;
    }

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
    // A load can pause the element while this player still means to play.
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
    const audio = audioRef.current;
    if (!audio) return;
    if (wantPlayingRef.current) void prepareThenPlay(audio);
    else giveUp(audio);
  }

  return (
    <span className="inline-flex" title="AI voice">
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
          aria-label={status === "playing" ? "Pause" : "Listen (AI voice)"}
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
