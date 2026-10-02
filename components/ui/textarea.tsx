"use client";

import type * as React from "react";
import { composeRenderProps, TextArea as TextareaPrimitive } from "react-aria-components";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<typeof TextareaPrimitive>) {
  return (
    <TextareaPrimitive
      data-slot="textarea"
      className={composeRenderProps(className, (className) =>
        cn("textarea w-full text-base aria-invalid:textarea-error sm:text-sm", className),
      )}
      {...props}
    />
  );
}

export { Textarea };
