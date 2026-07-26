"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { DomainSidebar } from "@/components/jargon/domain-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Domain } from "@/lib/jargon/types";
import { cn } from "@/lib/utils";

type DomainSidebarDrawerProps = {
  domains: Domain[];
  currentDomain: Domain;
  currentDomainId: string;
  className?: string;
};

export function DomainSidebarDrawer({
  domains,
  currentDomain,
  currentDomainId,
  className,
}: DomainSidebarDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPress={() => setOpen(true)}
        className={cn(
          "h-auto w-full justify-between gap-2 rounded-xl px-3 py-2.5 text-left md:hidden",
          className,
        )}
      >
        <span className="min-w-0 truncate text-sm font-medium">
          {currentDomain.icon ? `${currentDomain.icon} ` : ""}
          {currentDomain.name}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Button>

      <Sheet
        isOpen={open}
        onOpenChange={setOpen}
        side="left"
        className="w-[min(100%,18rem)] gap-0 p-0 sm:max-w-xs"
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>Domains</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <DomainSidebar
            domains={domains}
            currentDomainId={currentDomainId}
            onDomainSelect={() => setOpen(false)}
            className="min-h-0 flex-1"
          />
        </div>
      </Sheet>
    </>
  );
}
