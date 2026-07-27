"use client";

import type * as React from "react";
import { composeRenderProps, TextArea as TextareaPrimitive } from "react-aria-components";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<typeof TextareaPrimitive>) {
  return (
    <TextareaPrimitive
      data-slot="textarea"
      className={composeRenderProps(className, (className) =>
        cn("textarea w-full aria-invalid:textarea-error", className),
      )}
      {...props}
    />
  );
}

export { Textarea };
