"use client";

import { useCallback, useId, useMemo } from "react";
import { OverlayArrow, Popover } from "react-aria-components";
import { Button } from "@/components/ui/button";
import type { TourPlacement } from "@/lib/tour/chapters";
import type { TourTargetId } from "@/lib/tour/targets";

type TourStepCardProps = {
  targetId: TourTargetId;
  target: HTMLElement;
  title: string;
  body: string;
  placement: TourPlacement;
  stepNumber: number;
  stepCount: number;
  onNext: () => void;
  onSkip: () => void;
};

const ARROW_TRANSFORM: Record<TourPlacement, string> = {
  bottom: "translate(-50%, calc(50% + 1px)) rotate(45deg)",
  top: "translate(-50%, calc(-50% - 1px)) rotate(45deg)",
  left: "translate(calc(-50% - 1px), -50%) rotate(45deg)",
  right: "translate(calc(50% + 1px), -50%) rotate(45deg)",
};

export function TourStepCard({
  targetId,
  target,
  title,
  body,
  placement,
  stepNumber,
  stepCount,
  onNext,
  onSkip,
}: TourStepCardProps) {
  const titleId = useId();
  const triggerRef = useMemo(() => ({ current: target }), [target]);
  const isLast = stepNumber === stepCount;

  const bringTargetIntoView = useCallback(() => {
    target.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [target]);

  return (
    <Popover
      triggerRef={triggerRef}
      isOpen
      // Non-modal so the page stays usable: tapping the card being explained
      // must not close the tip. Only the tip's own buttons move it on.
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
      {/* The ring is a scoped style rule, not an attribute on the target, so
          the tour never touches markup React owns (or is still hydrating). */}
      <style>{`[data-tour="${targetId}"]{outline:2px solid var(--color-primary);outline-offset:4px}`}</style>
      <div
        ref={bringTargetIntoView}
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
          <Button size="sm" className="min-h-11 md:min-h-8" onPress={onNext}>
            {isLast ? "Got it" : "Next"}
          </Button>
        </div>
      </div>
    </Popover>
  );
}
