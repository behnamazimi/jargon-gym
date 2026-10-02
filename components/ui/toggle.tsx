"use client";

import { Check } from "lucide-react";
import {
  composeRenderProps,
  ToggleButton as TogglePrimitive,
  type ToggleButtonProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

type ToggleVariant = "default" | "outline";
type ToggleSize = "default" | "sm" | "lg";

const variantClasses: Record<ToggleVariant, string> = {
  default: "btn-ghost",
  outline: "btn-outline",
};

const sizeClasses: Record<ToggleSize, string> = {
  default: "",
  sm: "btn-sm",
  lg: "btn-lg",
};

function toggleClassName(variant: ToggleVariant, size: ToggleSize, className?: string) {
  return cn("btn data-selected:btn-active", variantClasses[variant], sizeClasses[size], className);
}

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: ToggleButtonProps & { variant?: ToggleVariant; size?: ToggleSize }) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={composeRenderProps(className, (className) =>
        toggleClassName(variant, size, className),
      )}
      {...props}
    />
  );
}

/** The look of every choice in the app: single-choice groups and filter chips.
 *  Roomier on touch screens, where the hit area reaches 44px. */
export function choiceClassName(className?: string) {
  return cn(
    "group relative inline-flex min-h-8 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-field border border-base-300 bg-base-100 px-4 text-center text-sm whitespace-normal text-base-content outline-hidden select-none coarse:min-h-10",
    "after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']",
    "transition-[background-color,border-color,scale] duration-150 motion-reduce:transition-none hover:bg-base-200/60",
    "data-selected:border-primary/60 data-selected:bg-primary/10 data-selected:text-[color-mix(in_oklab,var(--color-primary)_35%,var(--color-base-content))] data-selected:hover:bg-primary/15",
    "data-pressed:scale-[0.97] data-disabled:cursor-not-allowed data-disabled:opacity-50",
    "data-focus-visible:ring-2 data-focus-visible:ring-primary data-focus-visible:ring-offset-2 data-focus-visible:ring-offset-base-100",
    className,
  );
}

function CheckMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0 overflow-hidden transition-[width,margin,opacity] duration-150 motion-reduce:transition-none",
        selected ? "w-3.5 opacity-100" : "-me-1.5 w-0 opacity-0",
      )}
    >
      <Check className="size-3.5" strokeWidth={2} />
    </span>
  );
}

export function renderChoiceChildren(children: ToggleButtonProps["children"]) {
  return composeRenderProps(children, (child, { isSelected }) => (
    <>
      <CheckMark selected={isSelected} />
      {child}
    </>
  ));
}

/** A standalone on/off chip, for filters. */
function ToggleChip({ className, children, ...props }: ToggleButtonProps) {
  return (
    <TogglePrimitive
      data-slot="toggle-chip"
      className={composeRenderProps(className, (className) => choiceClassName(className))}
      {...props}
    >
      {renderChoiceChildren(children)}
    </TogglePrimitive>
  );
}

export { Toggle, ToggleChip };
