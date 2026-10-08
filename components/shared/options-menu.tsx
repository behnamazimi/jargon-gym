"use client";

import { Settings2, XIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Dialog as AriaDialog, DialogTrigger, Popover } from "react-aria-components";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-platform";
import { PLATFORM_MEDIA } from "@/lib/platform";

function GearButton({
  label,
  tourTarget,
  onPress,
}: {
  label: string;
  tourTarget?: string;
  onPress?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      data-tour={tourTarget}
      onPress={onPress}
      className="size-11 shrink-0 text-base-content/70 md:size-9"
    >
      <Settings2 className="size-4" aria-hidden strokeWidth={1.5} />
    </Button>
  );
}

/** A gear that opens a list of options: a bottom sheet on phone (like the
 *  More sheet), a dropdown-style popover on desktop. */
export function OptionsMenu({
  label,
  tourTarget,
  children,
}: {
  label: string;
  tourTarget?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isPhone = useMediaQuery(PLATFORM_MEDIA.phone, true);

  if (!isPhone) {
    return (
      <DialogTrigger isOpen={open} onOpenChange={setOpen}>
        <GearButton label={label} tourTarget={tourTarget} />
        <Popover
          placement="bottom end"
          offset={6}
          className="dropdown-content z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-box bg-base-100 shadow-md ring-1 ring-base-content/10"
        >
          <AriaDialog
            aria-label={label}
            className="max-h-[min(36rem,80dvh)] overflow-y-auto outline-none"
          >
            <p className="m-0 border-b border-base-300/60 px-4 py-3 text-sm font-medium">{label}</p>
            {children}
          </AriaDialog>
        </Popover>
      </DialogTrigger>
    );
  }

  return (
    <>
      <GearButton label={label} tourTarget={tourTarget} onPress={() => setOpen(true)} />
      <Sheet
        isOpen={open}
        onOpenChange={setOpen}
        side="bottom"
        showCloseButton={false}
        className="max-h-[min(36rem,85dvh)] rounded-t-2xl pb-safe"
      >
        <SheetHeader className="border-b border-base-300 px-4 py-3">
          <div className="flex items-center gap-1">
            <SheetTitle className="min-w-0 flex-1">{label}</SheetTitle>
            <SheetClose className="shrink-0">
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
        </SheetHeader>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </Sheet>
    </>
  );
}
