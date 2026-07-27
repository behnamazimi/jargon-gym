"use client";

import * as React from "react";
import {
  ToggleButtonGroup as ToggleGroupPrimitive,
  ToggleButton as TogglePrimitive,
  type ToggleButtonGroupProps,
  type ToggleButtonProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";
import { toggleClassName, type ToggleSize, type ToggleVariant } from "@/components/ui/toggle";

const ToggleGroupContext = React.createContext<{
  variant?: ToggleVariant;
  size?: ToggleSize;
}>({
  variant: "default",
  size: "default",
});

function ToggleGroup({
  className,
  variant,
  size,
  orientation = "horizontal",
  children,
  ...props
}: Omit<ToggleButtonGroupProps, "children"> & {
  variant?: ToggleVariant;
  size?: ToggleSize;
  children?: React.ReactNode;
}) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      orientation={orientation}
      className={cn(
        "join",
        orientation === "vertical" ? "join-vertical" : "join-horizontal",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

function ToggleGroupItem({
  className,
  variant = "default",
  size = "default",
  ...props
}: ToggleButtonProps & { variant?: ToggleVariant; size?: ToggleSize }) {
  const context = React.useContext(ToggleGroupContext);

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "join-item",
        toggleClassName(context.variant ?? variant, context.size ?? size),
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
