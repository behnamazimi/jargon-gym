import { type ReactNode, useCallback } from "react";
import { FirstExposureKnownPrompt } from "@/components/jargon/first-exposure-known-prompt";
import { TermCardHeader } from "@/components/jargon/term-card-header";
import { TermBody } from "@/components/jargon/term-body";
import type { ReviewTerm } from "@/lib/review/types";

export function ReadFullscreenCard({
  term,
  index,
  narrationAccess,
  narrationPreload,
  onExposed,
  onMarkedKnown,
  registerCardNode,
  unregisterCardNode,
}: {
  term: ReviewTerm;
  index: number;
  narrationAccess: boolean;
  narrationPreload: boolean;
  onExposed: (index: number, termId: string) => void;
  onMarkedKnown: () => void;
  registerCardNode: (termId: string, node: HTMLDivElement) => void;
  unregisterCardNode: (termId: string) => void;
}) {
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      registerCardNode(term.id, node);

      // One-shot: disconnect after the first crossing so scrolling back up
      // to reread this term can never refire the exposure event.
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
      observer.observe(node);
      return () => {
        observer.disconnect();
        unregisterCardNode(term.id);
      };
    },
    [index, term.id, onExposed, registerCardNode, unregisterCardNode],
  );

  return (
    <div
      ref={ref}
      className="flex h-dvh w-full shrink-0 flex-col pt-safe pb-safe"
      style={{ scrollSnapAlign: "start" }}
    >
      <TermCardHeader
        term={term}
        narrationAccess={narrationAccess}
        narrationPreload={narrationPreload}
        style={{ paddingInlineEnd: "calc(env(safe-area-inset-right) + 3.25rem)" }}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <TermBody term={term} />
      </div>
      {term.isNewToUser ? (
        <div className="shrink-0 px-5 pb-4 sm:px-6">
          <FirstExposureKnownPrompt termId={term.id} onMarkedKnown={onMarkedKnown} />
        </div>
      ) : null}
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
