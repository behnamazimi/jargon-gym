"use client";

import { useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { OverlayArrow, Popover } from "react-aria-components";
import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { TourPlacement } from "@/lib/tour/chapters";
import type { TargetBox } from "./use-tour-dom";

type TourStepCardProps = {
  target: HTMLElement;
  box: TargetBox | null;
  title: string;
  body: string;
  placement?: TourPlacement;
  stepNumber: number;
  stepCount: number;
  focusPrimary: boolean;
  onNext: (viaKeyboard: boolean) => void;
  onDismiss: () => void;
  onSkip: () => void;
};

const RING_OFFSET_PX = 4;

const ARROW_TRANSFORM: Record<TourPlacement, string> = {
  bottom: "translate(-50%, calc(50% + 1px)) rotate(45deg)",
  top: "translate(-50%, calc(-50% - 1px)) rotate(45deg)",
  left: "translate(calc(-50% - 1px), -50%) rotate(45deg)",
  right: "translate(calc(50% + 1px), -50%) rotate(45deg)",
};

/** Drawn over the page rather than styled onto the target, so only this one
 *  element is ringed and the tour never touches markup React owns. */
function TargetRing({ target, box }: { target: HTMLElement; box: TargetBox }) {
  const radius = getComputedStyle(target).borderRadius;
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed z-[99999] outline-2 outline-primary"
      style={{
        top: box.top - RING_OFFSET_PX,
        left: box.left - RING_OFFSET_PX,
        width: box.width + RING_OFFSET_PX * 2,
        height: box.height + RING_OFFSET_PX * 2,
        borderRadius: radius === "0px" ? undefined : `calc(${radius} + ${RING_OFFSET_PX}px)`,
      }}
    />,
    document.body,
  );
}

export function TourStepCard({
  target,
  box,
  title,
  body,
  placement = "bottom",
  stepNumber,
  stepCount,
  focusPrimary,
  onNext,
  onDismiss,
  onSkip,
}: TourStepCardProps) {
  const titleId = useId();
  const triggerRef = useMemo(() => ({ current: target }), [target]);
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

  return (
    <>
      <TargetRing target={target} box={box} />
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
        placement={placement}
        offset={12}
        className="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-box border border-base-300 bg-base-100 p-4 shadow-md"
      >
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
        <div
          data-tour-card=""
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="flex flex-col gap-3"
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
              onPress={(event) => onNext(event.pointerType === "keyboard")}
            >
              {isLast ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </Popover>
    </>
  );
}
