import { type ReactNode, useEffect, useRef } from "react";
import { FirstExposureKnownPrompt } from "@/components/jargon/first-exposure-known-prompt";
import { TermCardHeader } from "@/components/jargon/term-card-header";
import { TermBody } from "@/components/jargon/term-body";
import type { ReviewTerm } from "@/lib/review/types";

export function ReadFullscreenCard({
  term,
  index,
  narrationAccess,
  onExposed,
  onMarkedKnown,
  cardNodesRef,
}: {
  term: ReviewTerm;
  index: number;
  narrationAccess: boolean;
  onExposed: (index: number, termId: string) => void;
  onMarkedKnown: (index: number) => void;
  cardNodesRef: React.RefObject<Map<string, HTMLDivElement>>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Registers this card's node under its term id so the feed can scroll
  // to whichever term the shared queue's position points at, once, on
  // mount (see ReadFullscreenFeed).
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
        {term.isNewToUser ? (
          <FirstExposureKnownPrompt termId={term.id} onMarkedKnown={() => onMarkedKnown(index)} />
        ) : null}
        <TermBody term={term} />
      </div>
    </div>
  );
}

export function ReadFullscreenSlide({
  children,
  className = "items-center justify-center text-center",
  slideRef,
}: {
  children: ReactNode;
  className?: string;
  slideRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={slideRef}
      className={`flex h-dvh w-full shrink-0 flex-col gap-4 px-6 pt-safe pb-safe ${className}`}
      style={{ scrollSnapAlign: "start" }}
    >
      {children}
    </div>
  );
}
