"use client";

import { Eye } from "lucide-react";
import { useEffect, useRef } from "react";
import { AdminOnly } from "@/components/admin-only";
import { PickReasonBadges } from "@/components/jargon/pick-reason-badges";
import { QueueScoreDebug } from "@/components/jargon/queue-score-debug";
import { StrengthBadge } from "@/components/jargon/strength-badge";
import { TermBody } from "@/components/jargon/term-body";
import type { ReviewTerm } from "@/lib/review/types";
import { cn } from "@/lib/utils";
import { useReviewSwipe } from "./use-review-swipe";

type ReviewCardProps = {
  term: ReviewTerm;
  revealed: boolean;
  onReveal: () => void;
  onPrevious: () => void;
  onNext: () => void;
  reduceMotion: boolean;
  swipeEnabled: boolean;
};

function ReviewCardHeader({ term }: { term: ReviewTerm }) {
  return (
    <header className="shrink-0 border-b border-base-300/60 px-5 py-3 sm:px-6">
      <h2 className="font-heading m-0 text-xl font-semibold tracking-tight text-base-content sm:text-2xl sm:leading-tight">
        {term.term}
      </h2>
      <p className="mt-1 mb-0 text-xs tracking-wide text-base-content/50">
        <span>{term.domainName}</span>
        <span className="mx-1.5 text-base-content/35" aria-hidden>
          ·
        </span>
        <span>{term.category}</span>
      </p>
    </header>
  );
}

export function ReviewCard({
  term,
  revealed,
  onReveal,
  onPrevious,
  onNext,
  reduceMotion,
  swipeEnabled,
}: ReviewCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [term.id]);

  const swipe = useReviewSwipe(cardRef, {
    onReveal,
    onPrevious,
    onNext,
    enabled: swipeEnabled,
  });

  return (
    <div
      ref={cardRef}
      className="relative min-h-0 flex-1 [perspective:1200px]"
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
    >
      <div
        className={cn("absolute inset-0", !revealed && "cursor-pointer")}
        role={revealed ? undefined : "button"}
        tabIndex={revealed ? undefined : 0}
        onClick={() => {
          if (!revealed) onReveal();
        }}
        onKeyDown={(event) => {
          if (revealed) return;
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            onReveal();
          }
        }}
        aria-label={revealed ? undefined : `Reveal answer for ${term.term}`}
      >
        <div
          className={cn(
            "h-full w-full [transform-style:preserve-3d]",
            !reduceMotion && "transition-transform duration-300 ease-out",
            revealed && "[transform:rotateY(180deg)]",
          )}
        >
          <div className="shadow-surface absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-base-100 [backface-visibility:hidden]">
            <div
              className="flex shrink-0 items-center justify-center gap-2 px-5 pb-6 text-sm sm:px-6"
              aria-hidden
            >
              <Eye className="invisible size-4 shrink-0" strokeWidth={1.5} />
              <span className="invisible">Tap to reveal</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-5 text-center sm:px-6">
              <AdminOnly>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <StrengthBadge strength={term.strength} />
                  <PickReasonBadges reasons={term.pickReasons} context="review" mode="compact" />
                </div>
              </AdminOnly>
              <h2 className="font-heading m-0 max-w-full text-2xl font-semibold tracking-tight text-balance text-base-content sm:text-3xl sm:leading-tight">
                {term.term}
              </h2>
              <p className="m-0 text-xs tracking-wide text-base-content/50">
                <span>{term.domainName}</span>
                <span className="mx-1.5 text-base-content/35" aria-hidden>
                  ·
                </span>
                <span>{term.category}</span>
              </p>
            </div>
            <div
              className={cn(
                "flex shrink-0 items-center justify-center gap-2 px-5 pb-6 text-sm text-base-content/60 sm:px-6",
                revealed && "pointer-events-none opacity-0",
              )}
              aria-hidden={revealed}
            >
              <Eye className="size-4 shrink-0" aria-hidden strokeWidth={1.5} />
              <span className="inline md:hidden coarse:inline">Tap to reveal</span>
              <span className="hidden md:inline coarse:hidden">Click or press Enter to reveal</span>
            </div>
          </div>

          <div className="shadow-surface-raised absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-base-100 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <ReviewCardHeader term={term} />
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6"
              onClick={(event) => event.stopPropagation()}
            >
              <TermBody key={term.id} term={term} />
              <AdminOnly>
                <QueueScoreDebug term={term} context="review" />
              </AdminOnly>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
