"use client";

import { Link2, PauseCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Domain } from "@/lib/jargon/types";
import { cn } from "@/lib/utils";

type CollectionTabsProps = {
  domains: Domain[];
  currentDomainId: string;
};

export function CollectionTabs({ domains, currentDomainId }: CollectionTabsProps) {
  const router = useRouter();

  if (domains.length === 0) return null;

  return (
    <div className="rounded-t-lg border-b border-border/60 bg-muted/40 p-2">
      <Tabs
        selectedKey={currentDomainId}
        onSelectionChange={(key) => {
          if (key !== currentDomainId) router.push(`/jargon?domain=${key}`);
        }}
        className="gap-0"
      >
        <TabsList
          variant="default"
          className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {domains.map((domain) => {
            const isSelected = domain.id === currentDomainId;
            const pct =
              domain.termCount > 0 ? Math.round((domain.knownCount / domain.termCount) * 100) : 0;

            return (
              <TabsTrigger
                key={domain.id}
                id={domain.id}
                aria-label={
                  domain.source === "added"
                    ? `${domain.name} (added to your collection)`
                    : domain.name
                }
                className={cn(
                  "h-auto max-w-[200px] shrink-0 flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left shadow-none",
                  isSelected
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "bg-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground",
                )}
              >
                <span className="flex w-full min-w-0 items-center gap-1.5">
                  {domain.source === "added" ? (
                    <Link2 className="size-3 shrink-0 opacity-60" aria-label="Added" />
                  ) : null}
                  <span className="truncate text-sm font-medium">
                    {domain.icon ? `${domain.icon} ` : ""}
                    {domain.name}
                  </span>
                  {!domain.isActiveForReview ? (
                    <PauseCircle
                      className="ml-auto size-3 shrink-0 opacity-50"
                      aria-label="Paused"
                    />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    isSelected ? "text-primary" : "text-muted-foreground/70",
                  )}
                >
                  {domain.knownCount}/{domain.termCount} known
                  {isSelected && domain.termCount > 0 ? ` · ${pct}%` : ""}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
