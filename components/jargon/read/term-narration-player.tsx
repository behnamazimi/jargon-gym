"use client";

import { Loader2, Pause, Volume2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { getTermNarrationAction } from "@/app/(private)/jargon/read/narration-actions";
import { Button } from "@/components/ui/button";

export function TermNarrationPlayer({ termId }: { termId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [, startTransition] = useTransition();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function handlePress() {
    if (status === "playing") {
      audioRef.current?.pause();
      setStatus("paused");
      return;
    }

    if (status === "paused" && audioRef.current) {
      audioRef.current.play();
      setStatus("playing");
      return;
    }

    setStatus("loading");
    startTransition(async () => {
      const result = await getTermNarrationAction(termId);
      if (result.status !== "ready") {
        setStatus("idle"); // fail silently — next press retries
        return;
      }

      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = result.signedUrl;
      audio.onended = () => setStatus("idle");
      audio.onerror = () => setStatus("idle");

      try {
        await audio.play();
        setStatus("playing");
      } catch {
        setStatus("idle");
      }
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
