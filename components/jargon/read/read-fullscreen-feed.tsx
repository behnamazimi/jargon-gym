"use client";

import { X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  getReadFeedBatchAction,
  recordReadRevealAction,
} from "@/app/(private)/jargon/read/actions";
import { FirstExposureKnownPrompt } from "@/components/jargon/first-exposure-known-prompt";
import { ReadCaughtUp } from "@/components/jargon/read/read-caught-up";
import { TermCardHeader } from "@/components/jargon/term-card-header";
import { TermBody } from "@/components/jargon/term-body";
import { Button } from "@/components/ui/button";
import { useFullscreenExit } from "@/hooks/use-fullscreen-exit";
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
  // Gates FirstExposureKnownPrompt: once this card's read is recorded, the
  // "already know it?" self-check no longer makes sense to keep offering.
  const [exposed, setExposed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // One-shot: disconnect after the first crossing so scrolling back up to
    // reread this term can never refire the exposure event.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setExposed(true);
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
      className="flex h-dvh w-full shrink-0 flex-col pt-safe"
      style={{ scrollSnapAlign: "start" }}
    >
      <TermCardHeader term={term} narrationAccess={narrationAccess} />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 pb-safe sm:px-6">
        {term.isNewToUser && !exposed ? <FirstExposureKnownPrompt termId={term.id} /> : null}
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
  domainId,
  narrationAccess,
  initialExcludeTermIds,
  onExit,
}: {
  domainId: string;
  narrationAccess: boolean;
  /** Term ids already loaded elsewhere (the still-masked card in the
   *  paged Read view) that shouldn't be re-served here — otherwise the
   *  same term could get its read recorded twice: once via scroll here,
   *  once via an explicit reveal back in the paged view. */
  initialExcludeTermIds: string[];
  onExit: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [terms, setTerms] = useState<ReviewTerm[]>([]);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadedTermIdsRef = useRef<Set<string>>(new Set(initialExcludeTermIds));
  const countedTermIdsRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);
  const loadMoreRef = useRef<() => void>(() => {});
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

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
      inFlightRef.current = false;
    }
  }, [domainId]);
  loadMoreRef.current = loadMore;

  useEffect(() => {
    void loadMore();
    // Only ever run the initial load once per mount — domainId doesn't
    // change under a mounted feed (entering fullscreen fixes it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A single, stable observer bound to the sentinel via a callback ref
  // (same pattern as hooks/use-shared-domains-browse.ts's bindSentinel),
  // rather than one recreated on every batch — the sentinel element never
  // moves, so there's nothing to re-observe as `terms` grows.
  const bindSentinel = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current();
      },
      { rootMargin: "200% 0px" },
    );
    observerRef.current = observer;
    observer.observe(node);
  }, []);

  const handleExposed = useCallback((termId: string) => {
    if (countedTermIdsRef.current.has(termId)) return;
    countedTermIdsRef.current.add(termId);
    void recordReadRevealAction(termId);
  }, []);

  const { requestExit } = useFullscreenExit(true, onExit);

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

      {terms.map((term) => (
        <ReadFullscreenCard
          key={term.id}
          term={term}
          narrationAccess={narrationAccess}
          onExposed={handleExposed}
        />
      ))}

      {status !== "endOfQueue" && status !== "error" ? (
        <div ref={bindSentinel} aria-hidden className="h-px w-full shrink-0" />
      ) : null}

      {status === "endOfQueue" ? (
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

      {status === "error" ? (
        <ReadFullscreenSlide>
          <p className="m-0 text-sm text-base-content/70">
            {errorMessage ?? "Couldn't load more terms."}
          </p>
          <Button type="button" variant="outline" onPress={requestExit}>
            Exit focus mode
          </Button>
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
