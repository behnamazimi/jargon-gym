"use client";

import { PartyPopper, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getReadFeedBatchAction,
  recordReadRevealAction,
} from "@/app/(private)/jargon/read/actions";
import { FirstExposureKnownPrompt } from "@/components/jargon/first-exposure-known-prompt";
import { TermCardHeader } from "@/components/jargon/term-card-header";
import { TermBody } from "@/components/jargon/term-body";
import { Button } from "@/components/ui/button";
import { useFullscreenElement } from "@/hooks/use-fullscreen-element";
import type { ReviewTerm } from "@/lib/review/types";

type FeedStatus = "loading" | "ready" | "endOfQueue" | "error";

function ReadFullscreenCard({
  term,
  narrationAccess,
  onExposed,
}: {
  term: ReviewTerm;
  narrationAccess: boolean;
  onExposed: (termId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // One-shot: disconnect after the first crossing so scrolling back up to
    // reread this term can never refire the exposure event.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onExposed(term.id);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [term.id, onExposed]);

  return (
    <div
      ref={ref}
      className="flex h-dvh w-full shrink-0 flex-col"
      style={{ scrollSnapAlign: "start" }}
    >
      <TermCardHeader term={term} narrationAccess={narrationAccess} />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        {term.isNewToUser ? <FirstExposureKnownPrompt termId={term.id} /> : null}
        <TermBody term={term} />
      </div>
    </div>
  );
}

function ReadFullscreenEndOfQueue({ onExit }: { onExit: () => void }) {
  return (
    <div
      className="flex h-dvh w-full shrink-0 flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <PartyPopper className="size-5" aria-hidden strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <h2 className="m-0 text-base font-semibold text-base-content">You&apos;re all caught up</h2>
        <p className="m-0 text-sm leading-relaxed text-base-content/60">
          Nothing left to read right now — check back later.
        </p>
      </div>
      <Button type="button" variant="outline" onPress={onExit}>
        Exit focus mode
      </Button>
    </div>
  );
}

export function ReadFullscreenFeed({
  domainId,
  narrationAccess,
  onExit,
}: {
  domainId: string;
  narrationAccess: boolean;
  onExit: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [terms, setTerms] = useState<ReviewTerm[]>([]);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadedTermIdsRef = useRef<Set<string>>(new Set());
  const countedTermIdsRef = useRef<Set<string>>(new Set());
  const fetchingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const result = await getReadFeedBatchAction(domainId, [...loadedTermIdsRef.current]);

      if (result.error) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }

      if (result.caughtUp || result.terms.length === 0) {
        setStatus("endOfQueue");
        return;
      }

      for (const term of result.terms) loadedTermIdsRef.current.add(term.id);
      setTerms((current) => [...current, ...result.terms]);
      setStatus("ready");
    } finally {
      fetchingRef.current = false;
    }
  }, [domainId]);

  useEffect(() => {
    void loadMore();
    // Only ever run the initial load once per mount — domainId doesn't
    // change under a mounted feed (entering fullscreen fixes it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || status === "endOfQueue" || status === "error") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) void loadMore();
        }
      },
      { rootMargin: "200% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [status, loadMore, terms.length]);

  const handleExposed = useCallback((termId: string) => {
    if (countedTermIdsRef.current.has(termId)) return;
    countedTermIdsRef.current.add(termId);
    void recordReadRevealAction(termId);
  }, []);

  const { mode, requestExit } = useFullscreenElement(containerRef, true, onExit);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto overscroll-contain bg-base-100 outline-none"
      style={{ scrollSnapType: "y mandatory" }}
      data-fullscreen-mode={mode}
    >
      <span className="sr-only" role="status">
        Focus mode — scroll to read, press Escape to exit.
      </span>

      {terms.map((term) => (
        <ReadFullscreenCard
          key={term.id}
          term={term}
          narrationAccess={narrationAccess}
          onExposed={handleExposed}
        />
      ))}

      <div ref={sentinelRef} aria-hidden className="h-px w-full shrink-0" />

      {status === "endOfQueue" ? <ReadFullscreenEndOfQueue onExit={requestExit} /> : null}

      {status === "error" ? (
        <div
          className="flex h-dvh w-full shrink-0 flex-col items-center justify-center gap-4 px-6 text-center"
          style={{ scrollSnapAlign: "start" }}
        >
          <p className="m-0 text-sm text-base-content/70">
            {errorMessage ?? "Couldn't load more terms."}
          </p>
          <Button type="button" variant="outline" onPress={requestExit}>
            Exit focus mode
          </Button>
        </div>
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
