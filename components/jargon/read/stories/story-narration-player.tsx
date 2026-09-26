"use client";

import { Headphones, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { claimActiveAudio, releaseActiveAudio } from "@/components/jargon/active-audio";
import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";

const RETRY_INTERVAL_MS = 3000;
const PREPARE_TIMEOUT_MS = 2 * 60 * 1000;

type PlayerStatus = "idle" | "preparing" | "ready" | "capped" | "unavailable";

const STATUS_MESSAGES: Partial<Record<PlayerStatus, string>> = {
  preparing: "Preparing audio…",
  capped: "Daily listening limit reached. Try again tomorrow.",
  unavailable: "Audio unavailable for this story.",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Audio is generated on the first Listen tap, so the player asks the route
 *  to prepare it (retrying while another request is still generating), then
 *  hands the ready file to a native <audio> element for seeking. */
export function StoryNarrationPlayer({ storyId }: { storyId: string }) {
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);
  const src = `/api/stories/${storyId}/narration`;

  useMountEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        releaseActiveAudio(audio);
      }
    };
  });

  async function prepare() {
    setStatus("preparing");
    const deadline = Date.now() + PREPARE_TIMEOUT_MS;
    while (!cancelledRef.current && Date.now() < deadline) {
      let response: Response;
      try {
        response = await fetch(`${src}?prepare=1`);
      } catch {
        break;
      }
      if (cancelledRef.current) return;
      if (response.status === 204) {
        setStatus("ready");
        return;
      }
      if (response.status === 429) {
        setStatus("capped");
        return;
      }
      if (response.status !== 202) break;
      await sleep(RETRY_INTERVAL_MS);
    }
    if (!cancelledRef.current) setStatus("unavailable");
  }

  if (status === "ready") {
    return (
      <audio
        ref={audioRef}
        autoPlay
        controls
        src={src}
        preload="auto"
        className="h-10 w-full"
        onPlay={(event) => claimActiveAudio(event.currentTarget)}
        onPause={(event) => releaseActiveAudio(event.currentTarget)}
        onEnded={(event) => releaseActiveAudio(event.currentTarget)}
      />
    );
  }

  const message = STATUS_MESSAGES[status];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onPress={() => void prepare()}
        isDisabled={status === "preparing" || status === "capped"}
        className="max-md:min-h-11"
      >
        {status === "preparing" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden strokeWidth={1.5} />
        ) : (
          <Headphones className="size-4" aria-hidden strokeWidth={1.5} />
        )}
        Listen
      </Button>
      {message ? (
        <p className="m-0 text-xs text-base-content/60" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
