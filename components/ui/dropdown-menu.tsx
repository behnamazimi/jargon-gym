"use client";

import * as React from "react";
import {
  composeRenderProps,
  Header as HeaderPrimitive,
  MenuItem as MenuItemPrimitive,
  Menu as MenuPrimitive,
  MenuSection as MenuSectionPrimitive,
  MenuTrigger as MenuTriggerPrimitive,
  Popover as PopoverPrimitive,
  Separator as SeparatorPrimitive,
  SubmenuTrigger as SubmenuTriggerPrimitive,
  type MenuItemProps as MenuItemPrimitiveProps,
  type MenuSectionProps as MenuSectionPrimitiveProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";
import { CheckIcon, ChevronRightIcon } from "lucide-react";

function DropdownMenuTrigger({ ...props }: React.ComponentProps<typeof MenuTriggerPrimitive>) {
  return <MenuTriggerPrimitive data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenu({
  "data-slot": dataSlot = "dropdown-menu-content",
  placement = "bottom start",
  offset = 4,
  crossOffset = 0,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof MenuPrimitive<object>>, "children" | "className"> &
  Pick<React.ComponentProps<typeof PopoverPrimitive>, "placement" | "offset" | "crossOffset"> & {
    "data-slot"?: string;
    className?: string;
    children?: React.ReactNode;
  }) {
  return (
    <PopoverPrimitive
      data-slot={dataSlot}
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        "dropdown-content menu z-50 w-(--trigger-width) min-w-32 overflow-x-hidden overflow-y-auto rounded-box bg-base-100 p-1 shadow-md",
        "**:data-[slot$=-item]:data-focused:bg-base-200",
        className,
      )}
    >
      <MenuPrimitive
        className="max-h-[inherit] overflow-x-hidden overflow-y-auto outline-hidden"
        {...props}
      >
        {children}
      </MenuPrimitive>
    </PopoverPrimitive>
  );
}

function DropdownMenuGroup({
  ...props
}: Omit<MenuSectionPrimitiveProps<object>, "children"> & {
  children?: React.ReactNode;
}) {
  return <MenuSectionPrimitive data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof HeaderPrimitive> & {
  inset?: boolean;
}) {
  return (
    <HeaderPrimitive
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("px-2 py-1.5 text-xs text-base-content/60 data-inset:pl-7.5", className)}
      {...props}
    />
  );
}

function dropdownMenuItemClassName(selectionMode: "none" | "single" | "multiple") {
  return cn(
    "group/dropdown-menu-item relative flex min-h-8 cursor-default items-center gap-2 rounded-field px-2 py-1 text-sm outline-hidden select-none data-focused:bg-base-200 data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-7.5",
    selectionMode !== "none" && "pr-8",
    "data-[variant=destructive]:text-error data-[variant=destructive]:data-focused:bg-error/10",
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  children,
  ...props
}: MenuItemPrimitiveProps<object> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <MenuItemPrimitive
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      textValue={typeof children === "string" ? children : props.textValue}
      className={composeRenderProps(className, (className, { selectionMode }) =>
        cn(dropdownMenuItemClassName(selectionMode), className),
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected, selectionMode }) => (
        <>
          {selectionMode !== "none" ? (
            <span
              className="pointer-events-none absolute right-2 flex items-center justify-center"
              data-slot={
                selectionMode === "single"
                  ? "dropdown-menu-radio-item-indicator"
                  : "dropdown-menu-checkbox-item-indicator"
              }
            >
              {isSelected ? <CheckIcon className="size-3.5" /> : null}
            </span>
          ) : null}
          {children}
        </>
      ))}
    </MenuItemPrimitive>
  );
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof SubmenuTriggerPrimitive>) {
  return <SubmenuTriggerPrimitive data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuItemPrimitiveProps<object> & {
  inset?: boolean;
}) {
  return (
    <MenuItemPrimitive
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      textValue={typeof children === "string" ? children : props.textValue}
      className={cn(
        "flex min-h-8 cursor-default items-center gap-2 rounded-field px-2 py-1 text-sm outline-hidden select-none data-focused:bg-base-200 data-open:bg-base-200 data-inset:pl-7.5",
        className,
      )}
      {...props}
    >
      {composeRenderProps(children, (children) => (
        <>
          {children}
          <ChevronRightIcon className="ml-auto size-3.5" />
        </>
      ))}
    </MenuItemPrimitive>
  );
}

function DropdownMenuSubContent({
  placement = "end top",
  crossOffset = -3,
  offset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenu>) {
  return (
    <DropdownMenu
      data-slot="dropdown-menu-sub-content"
      className={cn("w-auto min-w-32", className)}
      placement={placement}
      crossOffset={crossOffset}
      offset={offset}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-base-300", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ml-auto text-[0.625rem] tracking-widest text-base-content/60", className)}
      {...props}
    />
  );
}

export {
  DropdownMenuTrigger,
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
