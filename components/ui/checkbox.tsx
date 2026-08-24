import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<ComponentProps<"input">, "type" | "checked" | "onChange"> & {
  isSelected?: boolean;
  isDisabled?: boolean;
  onChange?: (isSelected: boolean) => void;
};

function Checkbox({ className, isSelected, isDisabled, onChange, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn("checkbox", className)}
      checked={isSelected}
      disabled={isDisabled}
      onChange={(event) => onChange?.(event.target.checked)}
      {...props}
    />
  );
}

export { Checkbox };
