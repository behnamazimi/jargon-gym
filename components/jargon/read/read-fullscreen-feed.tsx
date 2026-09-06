"use client";

import { X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { FirstExposureKnownPrompt } from "@/components/jargon/first-exposure-known-prompt";
import { ReadCaughtUp } from "@/components/jargon/read/read-caught-up";
import type { ReadQueue } from "@/components/jargon/read/use-read-queue";
import { TermCardHeader } from "@/components/jargon/term-card-header";
import { TermBody } from "@/components/jargon/term-body";
import { Button } from "@/components/ui/button";
import { useFullscreenExit } from "@/hooks/use-fullscreen-exit";
import type { ReviewTerm } from "@/lib/review/types";

function ReadFullscreenCard({
  term,
  index,
  narrationAccess,
  isRevealed,
  onExposed,
  cardNodesRef,
}: {
  term: ReviewTerm;
  index: number;
  narrationAccess: boolean;
  isRevealed: boolean;
  onExposed: (index: number, termId: string) => void;
  cardNodesRef: React.RefObject<Map<string, HTMLDivElement>>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Registers this card's node under its term id so the feed can scroll
  // to whichever term the shared queue's position points at, once, on
  // mount (see ReadFullscreenFeed below).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    cardNodesRef.current.set(term.id, el);
    return () => {
      cardNodesRef.current.delete(term.id);
    };
  }, [term.id, cardNodesRef]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // One-shot: disconnect after the first crossing so scrolling back up to
    // reread this term can never refire the exposure event.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onExposed(index, term.id);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, term.id, onExposed]);

  return (
    <div
      ref={ref}
      className="flex h-dvh w-full shrink-0 flex-col pt-safe"
      style={{ scrollSnapAlign: "start" }}
    >
      <TermCardHeader
        term={term}
        narrationAccess={narrationAccess}
        style={{ paddingInlineEnd: "calc(env(safe-area-inset-right) + 3.25rem)" }}
      />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 pb-safe sm:px-6">
        {term.isNewToUser && !isRevealed ? <FirstExposureKnownPrompt termId={term.id} /> : null}
        <TermBody term={term} />
      </div>
    </div>
  );
}

function ReadFullscreenSlide({
  children,
  className = "items-center justify-center text-center",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-dvh w-full shrink-0 flex-col gap-4 px-6 pt-safe pb-safe ${className}`}
      style={{ scrollSnapAlign: "start" }}
    >
      {children}
    </div>
  );
}

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
  const cardNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasScrolledToInitialRef = useRef(false);
  // `queue` is a fresh object every render (its methods are individually
  // stable, but the returned bundle isn't) — mirrored into a ref so
  // handleExposed below can stay referentially stable itself instead of
  // changing identity on every render. Without this, every currently-
  // mounted card's IntersectionObserver effect (keyed on `onExposed`)
  // would tear down and recreate on every scroll-driven re-render, and a
  // freshly re-created observer re-evaluates intersection immediately —
  // re-firing exposure for a card that already fired moments earlier.
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const { requestExit } = useFullscreenExit(true, onExit);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Fullscreen renders the entire shared queue, not just what's ahead of
  // the current position, so entering it needs one explicit scroll to
  // wherever that position already is — otherwise it would default to
  // showing the very first term instead of resuming where the user was.
  useEffect(() => {
    if (hasScrolledToInitialRef.current) return;
    const currentTerm = queue.terms[queue.currentIndex];
    if (!currentTerm) return;
    const node = cardNodesRef.current.get(currentTerm.id);
    if (!node) return;
    hasScrolledToInitialRef.current = true;
    node.scrollIntoView({ behavior: "instant", block: "start" });
  }, [queue.terms, queue.currentIndex]);

  const handleExposed = useCallback((index: number, termId: string) => {
    queueRef.current.reveal(termId);
    queueRef.current.goToIndex(index);
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
          isRevealed={queue.isRevealed(term.id)}
          onExposed={handleExposed}
          cardNodesRef={cardNodesRef}
        />
      ))}

      {queue.status === "caughtUp" ? (
        <ReadFullscreenSlide>
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
        <ReadFullscreenSlide>
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
