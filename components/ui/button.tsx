"use client";

import type * as React from "react";
import NextLink from "next/link";
import {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link"
  | "success"
  | "warning"
  | "info";
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
  success: "btn-success",
  warning: "btn-warning",
  info: "btn-info",
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

function isAppHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

function LinkButton({
  className,
  variant = "default",
  size = "default",
  href,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof NextLink>, "href" | "className"> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  onPress?: () => void;
}) {
  const shared = {
    "data-slot": "button" as const,
    "data-variant": variant,
    "data-size": size,
    className: buttonClassName(variant, size, className),
    onClick: onPress,
  };

  if (isAppHref(href)) {
    return <NextLink href={href} {...shared} {...props} />;
  }

  return <a href={href} {...shared} {...props} />;
}

export { Button, LinkButton };
