"use client";

import {
  composeRenderProps,
  ToggleButtonGroup as ToggleGroupPrimitive,
  ToggleButton as TogglePrimitive,
  type ToggleButtonGroupProps,
  type ToggleButtonProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";
import { choiceClassName, renderChoiceChildren } from "@/components/ui/toggle";

function ToggleGroup({ className, orientation = "horizontal", ...props }: ToggleButtonGroupProps) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      orientation={orientation}
      className={composeRenderProps(className, (className) =>
        cn("flex gap-2", orientation === "vertical" ? "flex-col" : "flex-wrap", className),
      )}
      {...props}
    />
  );
}

function ToggleGroupItem({ className, children, ...props }: ToggleButtonProps) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={composeRenderProps(className, (className) => choiceClassName(className))}
      {...props}
    >
      {renderChoiceChildren(children)}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };
