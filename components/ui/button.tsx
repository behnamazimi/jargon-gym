"use client";

import type * as React from "react";
import {
  Button as ButtonPrimitive,
  Link as LinkPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
  type LinkProps as LinkPrimitiveProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

export type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
export type ButtonSize =
  | "default"
  | "xs"
  | "sm"
  | "lg"
  | "icon"
  | "icon-xs"
  | "icon-sm"
  | "icon-lg";

const variantClasses: Record<ButtonVariant, string> = {
  default: "btn-primary",
  outline: "btn-outline",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  destructive: "btn-error",
  link: "btn-link",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "",
  xs: "btn-xs",
  sm: "btn-sm",
  lg: "btn-lg",
  icon: "btn-square",
  "icon-xs": "btn-square btn-xs",
  "icon-sm": "btn-square btn-sm",
  "icon-lg": "btn-square btn-lg",
};

function buttonClassName(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn("btn", variantClasses[variant], sizeClasses[size], className);
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: Omit<ButtonPrimitiveProps, "className"> &
  React.RefAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={buttonClassName(variant, size, className)}
      {...props}
    />
  );
}

function LinkButton({
  className,
  variant = "default",
  size = "default",
  ...props
}: Omit<LinkPrimitiveProps, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <LinkPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={buttonClassName(variant, size, className)}
      {...props}
    />
  );
}

export { Button, LinkButton };
