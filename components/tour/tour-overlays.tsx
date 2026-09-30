"use client";

import type { CSSProperties } from "react";
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
 *  React owns. The ring fades out while the page scrolls and back in once
 *  it settles. Without `dim` it's just the ring, for someone who arrived
 *  mid-task. Everything outside the ring is blocked, so only the highlighted
 *  element can be used. */
export function TargetSpotlight({
  target,
  box,
  scrolling,
  dim,
}: {
  target: HTMLElement;
  box: TargetBox;
  scrolling: boolean;
  dim: boolean;
}) {
  const radius = getComputedStyle(target).borderRadius;
  const ring = {
    top: box.top - RING_OFFSET_PX,
    left: box.left - RING_OFFSET_PX,
    width: box.width + RING_OFFSET_PX * 2,
    height: box.height + RING_OFFSET_PX * 2,
  };
  return createPortal(
    <>
      <PageBlocker ring={ring} scrolling={scrolling} />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed outline-2 outline-primary transition-opacity duration-200 motion-reduce:transition-none",
          scrolling ? "opacity-0" : "opacity-100",
        )}
        style={{
          ...ring,
          borderRadius: radius === "0px" ? undefined : `calc(${radius} + ${RING_OFFSET_PX}px)`,
          boxShadow: dim ? `0 0 0 100vmax ${DIM}` : undefined,
          zIndex: OVERLAY_Z,
        }}
      />
    </>,
    document.body,
  );
}

type Rect = { top: number; left: number; width: number; height: number };

/** Four transparent panels around the ring that swallow clicks and touches,
 *  leaving the highlighted element as the only live spot. While the page is
 *  scrolling the ring's position is stale, so one panel covers everything. */
function PageBlocker({ ring, scrolling }: { ring: Rect; scrolling: boolean }) {
  const panels: CSSProperties[] = scrolling
    ? [{ inset: 0 }]
    : [
        { top: 0, left: 0, right: 0, height: Math.max(0, ring.top) },
        { top: ring.top + ring.height, left: 0, right: 0, bottom: 0 },
        { top: ring.top, left: 0, width: Math.max(0, ring.left), height: ring.height },
        { top: ring.top, left: ring.left + ring.width, right: 0, height: ring.height },
      ];
  return panels.map((style, index) => (
    <div
      key={index}
      aria-hidden
      className="fixed touch-none overscroll-contain"
      style={{ ...style, zIndex: OVERLAY_Z }}
    />
  ));
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
