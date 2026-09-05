"use client";

import { Loader2, Pause, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

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
 * no-ops instead of clobbering the new claim.
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

  function handlePress() {
    if (status === "playing") {
      audioRef.current?.pause(); // onpause below flips status to "paused"
      return;
    }

    if (status === "paused" && audioRef.current) {
      claimActiveAudio(audioRef.current);
      audioRef.current.play();
      setStatus("playing");
      return;
    }

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.src = `/api/narration/${termId}`;
    audio.onended = () => setStatus("idle");
    audio.onerror = () => {
      releaseActiveAudio(audio);
      setStatus("idle");
    };
    // Fires both when this player pauses itself and when another
    // TermNarrationPlayer claims the shared slot and stops this one —
    // either way it's "paused" (resumable), not "idle" (needs refetch).
    audio.onpause = () => {
      releaseActiveAudio(audio);
      setStatus("paused");
    };

    setStatus("loading");
    claimActiveAudio(audio);
    audio
      .play()
      .then(() => setStatus("playing"))
      .catch(() => {
        releaseActiveAudio(audio);
        setStatus("idle"); // fail silently — next press retries
      });
  }

  return (
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
  );
}
