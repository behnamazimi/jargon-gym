"use client";

import type * as React from "react";
import { composeRenderProps, Input as InputPrimitive } from "react-aria-components";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<typeof InputPrimitive>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={composeRenderProps(className, (className) =>
        cn("input w-full aria-invalid:input-error", className),
      )}
      {...props}
    />
  );
}

export { Input };
