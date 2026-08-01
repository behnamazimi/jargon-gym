"use client";

import { Eye } from "lucide-react";
import { useRef } from "react";
import type { ReviewTerm } from "@/lib/review/types";
import { PickReasonBadges } from "@/components/jargon/pick-reason-badges";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ReviewTermContent } from "./review-term-content";
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

  const swipe = useReviewSwipe(cardRef, {
    onReveal,
    onPrevious,
    onNext,
    enabled: swipeEnabled,
  });

  return (
    <div
      ref={cardRef}
      className="w-full [perspective:1200px]"
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
    >
      <div
        className={cn("relative mx-auto min-h-[22rem] w-full", !revealed && "cursor-pointer")}
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
            "relative min-h-[22rem] w-full [transform-style:preserve-3d]",
            !reduceMotion && "transition-transform duration-300 ease-out",
            revealed && "[transform:rotateY(180deg)]",
          )}
        >
          {/* Front */}
          <div
            className={cn(
              "shadow-surface absolute inset-0 flex flex-col rounded-2xl bg-base-100 p-4 [backface-visibility:hidden]",
            )}
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-6 text-center">
              <Badge variant="outline" className="font-normal">
                {term.category}
              </Badge>
              <h2 className="font-heading m-0 text-2xl font-semibold tracking-tight text-base-content sm:text-3xl">
                {term.term}
              </h2>
              <p className="m-0 text-xs text-base-content/50">{term.domainName}</p>
              <PickReasonBadges
                reasons={term.pickReasons}
                mode="compact"
                className="justify-center"
              />
            </div>

            <div
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl bg-base-200/50 py-3 text-sm text-base-content/60",
                revealed && "pointer-events-none opacity-0",
              )}
              aria-hidden={revealed}
            >
              <Eye className="size-4 shrink-0" aria-hidden strokeWidth={1.5} />
              Tap to reveal
            </div>
          </div>

          {/* Back */}
          <div
            className={cn(
              "shadow-surface-raised absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-base-100 [backface-visibility:hidden] [transform:rotateY(180deg)]",
            )}
          >
            <div className="border-b border-base-300/60 bg-primary/[0.04] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading m-0 text-lg font-semibold tracking-tight">
                  {term.term}
                </h2>
                <Badge variant="outline" className="font-normal">
                  {term.category}
                </Badge>
              </div>
              <PickReasonBadges reasons={term.pickReasons} mode="compact" className="mt-2" />
            </div>
            <div
              className="flex-1 overflow-y-auto px-4 py-4"
              onClick={(event) => event.stopPropagation()}
            >
              <ReviewTermContent term={term} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
