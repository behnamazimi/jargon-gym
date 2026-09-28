"use client";

import { useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { OverlayArrow, Popover } from "react-aria-components";
import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";
import type { TourPlacement } from "@/lib/tour/chapters";
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

/** Same dim DaisyUI puts behind its modals. */
const DIM = "oklch(0% 0 0 / 0.4)";

/** React Aria's overlay layer. The spotlight joins it so it also dims open
 *  menus and sheets; it mounts before the tip, so the tip stays on top. */
const OVERLAY_Z = 100000;

/** A ring around the target with the rest of the page dimmed around it (a
 *  huge shadow leaves a cut-out over the target). It's drawn over the page,
 *  so only this one element is highlighted and the tour never touches markup
 *  React owns. Clicks pass straight through, so the page stays usable. It
 *  fades out while the page scrolls and back in once it settles. */
function TargetSpotlight({
  target,
  box,
  scrolling,
}: {
  target: HTMLElement;
  box: TargetBox;
  scrolling: boolean;
}) {
  const radius = getComputedStyle(target).borderRadius;
  return createPortal(
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed outline-2 outline-primary transition-opacity duration-200 motion-reduce:transition-none",
        scrolling ? "opacity-0" : "opacity-100",
      )}
      style={{
        top: box.top - RING_OFFSET_PX,
        left: box.left - RING_OFFSET_PX,
        width: box.width + RING_OFFSET_PX * 2,
        height: box.height + RING_OFFSET_PX * 2,
        borderRadius: radius === "0px" ? undefined : `calc(${radius} + ${RING_OFFSET_PX}px)`,
        boxShadow: `0 0 0 100vmax ${DIM}`,
        zIndex: OVERLAY_Z,
      }}
    />,
    document.body,
  );
}

/** A target taller than this share of the screen (the Review card on a
 *  phone) leaves no room for the tip above or below it. */
const TALL_TARGET_SHARE = 0.5;
const TALL_TARGET_INSET_PX = 16;

/** Where the tip anchors: the target itself, or for a tall target a line
 *  just inside its bottom edge, so the tip sits over the target and stays
 *  on screen. */
function tipAnchor(box: TargetBox, placement: TourPlacement) {
  if (box.height <= window.innerHeight * TALL_TARGET_SHARE) {
    return { box, placement, offset: 12, inside: false };
  }
  return {
    box: {
      top: box.top + box.height - TALL_TARGET_INSET_PX,
      left: box.left,
      width: box.width,
      height: 0,
    },
    placement: "top" as const,
    offset: 0,
    inside: true,
  };
}

/** An invisible stand-in the tip anchors to, drawn over the page like the
 *  spotlight so it tracks the settled target box. */
function TipAnchor({
  box,
  onNode,
}: {
  box: TargetBox;
  onNode: (node: HTMLDivElement | null) => void;
}) {
  return createPortal(
    <div
      ref={onNode}
      aria-hidden
      className="pointer-events-none invisible fixed"
      style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
    />,
    document.body,
  );
}

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
  onNext,
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
                onPress={(event) => onNext(event.pointerType === "keyboard")}
              >
                {isLast ? "Got it" : "Next"}
              </Button>
            </div>
          </div>
        </Popover>
      )}
    </>
  );
}
