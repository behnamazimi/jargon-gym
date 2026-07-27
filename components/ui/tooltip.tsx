"use client";

import * as React from "react";
import {
  Focusable,
  OverlayArrow,
  Tooltip as TooltipPrimitive,
  TooltipTrigger as TooltipTriggerPrimitive,
} from "react-aria-components";

import { cn } from "@/lib/utils";

function TooltipTrigger({
  delay = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipTriggerPrimitive>) {
  const [trigger, tooltip] = React.Children.toArray(children);

  return (
    <TooltipTriggerPrimitive data-slot="tooltip-trigger" delay={delay} {...props}>
      <Focusable>{trigger as React.ComponentProps<typeof Focusable>["children"]}</Focusable>
      {tooltip}
    </TooltipTriggerPrimitive>
  );
}

function Tooltip({
  className,
  placement = "top",
  offset = 4,
  crossOffset = 0,
  children,
  ...props
}: Omit<React.ComponentProps<typeof TooltipPrimitive>, "children" | "className"> & {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <TooltipPrimitive
      data-slot="tooltip-content"
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        "z-50 inline-flex w-fit max-w-xs items-center gap-1.5 rounded-field bg-neutral px-3 py-1.5 text-xs text-neutral-content",
        className,
      )}
      {...props}
    >
      {children}
      <OverlayArrow
        className="z-50 size-2.5 rotate-45 rounded-[2px] bg-neutral fill-neutral"
        style={({ placement, defaultStyle }) => ({
          ...defaultStyle,
          rotate: "0deg",
          translate: "0 0",
          transform:
            placement === "bottom"
              ? "translate(-50%, calc(50% + 2px)) rotate(45deg)"
              : placement === "top"
                ? "translate(-50%, calc(-50% - 2px)) rotate(45deg)"
                : placement === "left"
                  ? "translate(calc(-50% - 2px), -50%) rotate(45deg)"
                  : "translate(calc(50% + 2px), -50%) rotate(45deg)",
        })}
      />
    </TooltipPrimitive>
  );
}

export { Tooltip, TooltipTrigger };
