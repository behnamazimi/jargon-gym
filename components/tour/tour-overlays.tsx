"use client";

import { createPortal } from "react-dom";
import type { TourPlacement } from "@/lib/tour/chapters";
import { cn } from "@/lib/utils";
import type { TargetBox } from "./use-tour-dom";

const RING_OFFSET_PX = 4;

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
export function TargetSpotlight({
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
export function tipAnchor(box: TargetBox, placement: TourPlacement) {
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
export function TipAnchor({
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
