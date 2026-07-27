"use client";

import type * as React from "react";
import { Group, type GroupProps } from "react-aria-components";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

function InputGroup({ className, ...props }: GroupProps) {
  return (
    <Group
      data-slot="input-group"
      className={cn("input w-full items-center gap-1", className)}
      {...props}
    />
  );
}

function InputGroupAddon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group-addon"
      className={cn("flex items-center gap-1 text-base-content/60", className)}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn("h-auto flex-1 border-0 bg-transparent p-0 focus:outline-none", className)}
      {...props}
    />
  );
}

export { InputGroup, InputGroupAddon, InputGroupInput };
