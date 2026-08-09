"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";

function Switch({
  className,
  onCheckedChange,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "onChange"> & {
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      data-slot="switch"
      className={cn("toggle", className)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  );
}

export { Switch };
