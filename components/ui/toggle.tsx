"use client";

import {
  composeRenderProps,
  ToggleButton as TogglePrimitive,
  type ToggleButtonProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

export type ToggleVariant = "default" | "outline";
export type ToggleSize = "default" | "sm" | "lg";

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

export { Toggle, toggleClassName };
