"use client";

import { ArrowRight } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { OverlayArrow, Popover } from "react-aria-components";
import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { TourPlacement } from "@/lib/tour/chapters";
import { TargetSpotlight, TipAnchor, tipAnchor } from "./tour-overlays";
import type { TargetBox } from "./use-tour-dom";

type TourStepCardProps = {
  target: HTMLElement;
  box: TargetBox | null;
  scrolling: boolean;
  title: string;
  body: string;
  placement?: TourPlacement;
  stepNumber: number;
  stepCount: number;
  focusPrimary: boolean;
  /** Set on the last tip of a page along the guided walk: the button moves
   *  on to that page instead of just closing the tip. */
  nextStopLabel?: string;
  onNext: (viaKeyboard: boolean) => void;
  onContinue: (viaKeyboard: boolean) => void;
  onDismiss: () => void;
  onSkip: () => void;
};

const ARROW_TRANSFORM: Record<TourPlacement, string> = {
  bottom: "translate(-50%, calc(50% + 1px)) rotate(45deg)",
  top: "translate(-50%, calc(-50% - 1px)) rotate(45deg)",
  left: "translate(calc(-50% - 1px), -50%) rotate(45deg)",
  right: "translate(calc(50% + 1px), -50%) rotate(45deg)",
};

export function TourStepCard({
  target,
  box,
  scrolling,
  title,
  body,
  placement = "bottom",
  stepNumber,
  stepCount,
  focusPrimary,
  nextStopLabel,
  onNext,
  onContinue,
  onDismiss,
  onSkip,
}: TourStepCardProps) {
  const titleId = useId();
  const [anchorNode, setAnchorNode] = useState<HTMLDivElement | null>(null);
  const triggerRef = useMemo(() => ({ current: anchorNode }), [anchorNode]);
  const isLast = stepNumber === stepCount;

  // The card is keyed per step and target, so this runs once each: bring the
  // target into view, count using the target itself as moving on, and let
  // Escape dismiss the chapter.
  useMountEffect(() => {
    target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const handleTargetClick = () => onNext(false);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onDismiss();
    };
    target.addEventListener("click", handleTargetClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      target.removeEventListener("click", handleTargetClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  if (!box) return null;
  const anchor = tipAnchor(box, placement);

  return (
    <>
      <TargetSpotlight target={target} box={box} scrolling={scrolling} />
      <TipAnchor box={anchor.box} onNode={setAnchorNode} />
      {scrolling || !anchorNode ? null : (
        <Popover
          // Re-anchor after the page scrolls or the target moves.
          key={`${box.top},${box.left},${box.width},${box.height}`}
          triggerRef={triggerRef}
          isOpen
          // Non-modal so the page stays usable: tapping the element being
          // explained must not close the tip. Only its own buttons, a click on
          // the target, or Escape move it on.
          isNonModal
          onOpenChange={() => {}}
          placement={anchor.placement}
          offset={anchor.offset}
          className="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-box border border-base-300 bg-base-100 shadow-md"
        >
          {anchor.inside ? null : (
            <OverlayArrow
              className="size-3 border-base-300 bg-base-100 data-[placement=bottom]:border-t data-[placement=bottom]:border-l data-[placement=left]:border-t data-[placement=left]:border-r data-[placement=right]:border-b data-[placement=right]:border-l data-[placement=top]:border-r data-[placement=top]:border-b"
              style={({ placement: arrowPlacement, defaultStyle }) => ({
                ...defaultStyle,
                transform:
                  ARROW_TRANSFORM[
                    arrowPlacement && arrowPlacement !== "center" ? arrowPlacement : placement
                  ],
              })}
            />
          )}
          <div
            data-tour-card=""
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            // Scrolls inside the popover's max height if the screen is ever
            // too short, so the buttons stay reachable.
            className="flex max-h-[inherit] flex-col gap-3 overflow-y-auto p-4"
          >
            <div>
              <p id={titleId} className="m-0 font-heading text-sm font-semibold text-base-content">
                {title}
              </p>
              <p className="m-0 mt-1 text-sm leading-relaxed text-base-content/70">{body}</p>
            </div>
            <div className="flex items-center gap-2">
              {stepCount > 1 ? (
                <span className="text-xs tabular-nums text-base-content/50">
                  {stepNumber} of {stepCount}
                </span>
              ) : null}
              <span className="flex-1" />
              <Button variant="ghost" size="sm" className="min-h-11 md:min-h-8" onPress={onSkip}>
                Skip tips
              </Button>
              <Button
                size="sm"
                className="min-h-11 md:min-h-8"
                autoFocus={focusPrimary}
                onPress={(event) =>
                  (nextStopLabel ? onContinue : onNext)(event.pointerType === "keyboard")
                }
              >
                {nextStopLabel ? (
                  <>
                    Next: {nextStopLabel}
                    <ArrowRight className="size-4" aria-hidden strokeWidth={1.5} />
                  </>
                ) : isLast ? (
                  "Got it"
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </div>
        </Popover>
      )}
    </>
  );
}
