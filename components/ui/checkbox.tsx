"use client";

import {
  Checkbox as CheckboxPrimitive,
  composeRenderProps,
  type CheckboxProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

function Checkbox({ className, children, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive
      data-slot="checkbox"
      className={cn(
        "group/checkbox relative flex size-4 shrink-0 items-center justify-center rounded-selector border-2 border-base-300 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 data-invalid:border-error data-selected:border-primary data-selected:bg-primary data-selected:text-primary-content",
        className,
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected, isIndeterminate }) => (
        <>
          <span
            data-slot="checkbox-indicator"
            className="grid place-content-center text-current [&>svg]:size-3.5"
          >
            {(isSelected || isIndeterminate) && <CheckIcon />}
          </span>
          {children}
        </>
      ))}
    </CheckboxPrimitive>
  );
}

export { Checkbox };
