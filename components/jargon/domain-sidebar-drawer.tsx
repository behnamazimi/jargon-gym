"use client";

import { ChevronDown } from "lucide-react";
import { DomainSidebar } from "@/components/jargon/domain-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Domain } from "@/lib/jargon/types";
import { cn } from "@/lib/utils";

type DomainSidebarDrawerProps = {
  domains: Domain[];
  currentDomain: Domain;
  currentDomainId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

export function DomainSidebarDrawer({
  domains,
  currentDomain,
  currentDomainId,
  open,
  onOpenChange,
  className,
}: DomainSidebarDrawerProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPress={() => onOpenChange(true)}
        className={cn(
          "shadow-surface h-auto w-full justify-between gap-2 rounded-xl px-3 py-2.5 text-left md:hidden",
          className,
        )}
      >
        <span className="min-w-0 truncate text-sm font-medium">
          {currentDomain.icon ? `${currentDomain.icon} ` : ""}
          {currentDomain.name}
        </span>
        <ChevronDown className="size-4 shrink-0 text-base-content/60" aria-hidden />
      </Button>

      <Sheet
        isOpen={open}
        onOpenChange={onOpenChange}
        side="left"
        className="w-[min(100%,18rem)] gap-0 p-0 sm:max-w-xs"
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>Collections</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <DomainSidebar
            domains={domains}
            currentDomainId={currentDomainId}
            onDomainSelect={() => onOpenChange(false)}
            className="min-h-0 flex-1"
          />
        </div>
      </Sheet>
    </>
  );
}
