"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { ReadCaughtUp } from "@/components/jargon/read/read-caught-up";
import {
  ReadFullscreenCard,
  ReadFullscreenSlide,
} from "@/components/jargon/read/read-fullscreen-card";
import { useReadFullscreenScroll } from "@/components/jargon/read/use-read-fullscreen-scroll";
import type { ReadQueue } from "@/components/jargon/read/use-read-queue";
import { Button } from "@/components/ui/button";
import { useFullscreenExit } from "@/hooks/use-fullscreen-exit";
import { useWakeLock } from "@/hooks/use-wake-lock";

export function ReadFullscreenFeed({
  queue,
  narrationAccess,
  onExit,
}: {
  queue: ReadQueue;
  narrationAccess: boolean;
  onExit: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { cardNodesRef, endSlideRef, handleExposed, handleMarkedKnown } =
    useReadFullscreenScroll(queue);

  const { requestExit } = useFullscreenExit(true, onExit);
  useWakeLock(true);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto overscroll-contain bg-base-100 outline-none"
      style={{ scrollSnapType: "y mandatory" }}
    >
      <span className="sr-only" role="status">
        Focus mode — scroll to read, press Escape to exit.
      </span>

      {queue.terms.map((term, index) => (
        <ReadFullscreenCard
          key={term.id}
          term={term}
          index={index}
          narrationAccess={narrationAccess}
          onExposed={handleExposed}
          onMarkedKnown={handleMarkedKnown}
          cardNodesRef={cardNodesRef}
        />
      ))}

      {queue.status === "caughtUp" ? (
        <ReadFullscreenSlide slideRef={endSlideRef}>
          <ReadCaughtUp
            description="Nothing left to read right now — check back later."
            actions={
              <Button type="button" variant="outline" onPress={requestExit}>
                Exit focus mode
              </Button>
            }
          />
        </ReadFullscreenSlide>
      ) : null}

      {queue.status === "error" ? (
        <ReadFullscreenSlide slideRef={endSlideRef}>
          <p className="m-0 text-sm text-base-content/70">
            {queue.errorMessage ?? "Couldn't load more terms."}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onPress={() => void queue.retry()}>
              Try again
            </Button>
            <Button type="button" variant="ghost" onPress={requestExit}>
              Exit focus mode
            </Button>
          </div>
        </ReadFullscreenSlide>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Exit focus mode"
        onPress={requestExit}
        className="fixed z-10 opacity-40 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100"
        style={{
          top: "calc(env(safe-area-inset-top) + 0.75rem)",
          right: "calc(env(safe-area-inset-right) + 0.75rem)",
        }}
      >
        <X className="size-4" aria-hidden strokeWidth={1.5} />
      </Button>
    </div>
  );
}
