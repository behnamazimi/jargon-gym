"use client";

import { PauseCircle, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Domain } from "@/lib/jargon/types";
import { cn } from "@/lib/utils";

type DomainSidebarProps = {
  domains: Domain[];
  currentDomainId: string;
  onDomainSelect?: () => void;
  className?: string;
};

function DomainSidebarSection({
  label,
  domains,
  currentDomainId,
  onSelect,
}: {
  label: string;
  domains: Domain[];
  currentDomainId: string;
  onSelect: (domainId: string) => void;
}) {
  if (domains.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="px-2 text-xs font-semibold tracking-wider text-base-content/60 uppercase">
        {label}
      </p>
      <ul className="space-y-0.5">
        {domains.map((domain) => {
          const isSelected = domain.id === currentDomainId;
          const pct =
            domain.termCount > 0
              ? Math.round((domain.termsLearnedCount / domain.termCount) * 100)
              : 0;

          return (
            <li key={domain.id}>
              <Button
                type="button"
                variant="ghost"
                aria-current={isSelected ? "page" : undefined}
                aria-label={
                  domain.source === "added"
                    ? `${domain.name} (added to your collection)`
                    : domain.name
                }
                onPress={() => onSelect(domain.id)}
                className={cn(
                  "h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left",
                  isSelected
                    ? "bg-base-200 text-base-content hover:bg-base-200"
                    : "hover:bg-base-200/60",
                )}
              >
                <span className="flex w-full min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-medium">
                    {domain.icon ? `${domain.icon} ` : ""}
                    {domain.name}
                  </span>
                  {!domain.isActiveForReview ? (
                    <PauseCircle
                      className="ml-auto size-3.5 shrink-0 opacity-50"
                      aria-label="Paused"
                      strokeWidth={1.5}
                    />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    isSelected ? "text-primary" : "text-base-content/60",
                  )}
                >
                  {domain.termsLearnedCount}/{domain.termCount} learned
                  {isSelected && domain.termCount > 0 ? ` · ${pct}%` : ""}
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DomainSidebar({
  domains,
  currentDomainId,
  onDomainSelect,
  className,
}: DomainSidebarProps) {
  const router = useRouter();
  const [filterQuery, setFilterQuery] = useState("");

  const filteredDomains = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return domains;
    return domains.filter((domain) => domain.name.toLowerCase().includes(query));
  }, [domains, filterQuery]);

  const ownedDomains = useMemo(
    () => filteredDomains.filter((domain) => domain.source === "owned"),
    [filteredDomains],
  );
  const addedDomains = useMemo(
    () => filteredDomains.filter((domain) => domain.source === "added"),
    [filteredDomains],
  );

  function handleSelect(domainId: string) {
    if (domainId !== currentDomainId) {
      router.push(`/jargon?domain=${domainId}`);
    }
    onDomainSelect?.();
  }

  if (domains.length === 0) return null;

  return (
    <nav aria-label="Collections" className={cn("flex min-h-0 flex-col gap-2 p-1", className)}>
      <div className="relative shrink-0">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-base-content/60"
          aria-hidden
          strokeWidth={1.5}
        />
        <Input
          type="search"
          value={filterQuery}
          onChange={(event) => setFilterQuery(event.target.value)}
          placeholder="Search collections…"
          aria-label="Search collections"
          className="rounded-lg py-2 pr-8 pl-8 text-sm"
        />
        {filterQuery ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-base-content/60 hover:text-base-content"
            onPress={() => setFilterQuery("")}
            aria-label="Clear filter"
          >
            <X className="size-3.5" aria-hidden strokeWidth={1.5} />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {filteredDomains.length === 0 ? (
          <p className="px-2 text-sm text-base-content/60">No collections match your search.</p>
        ) : (
          <>
            <DomainSidebarSection
              label="Owned"
              domains={ownedDomains}
              currentDomainId={currentDomainId}
              onSelect={handleSelect}
            />
            <DomainSidebarSection
              label="Added"
              domains={addedDomains}
              currentDomainId={currentDomainId}
              onSelect={handleSelect}
            />
          </>
        )}
      </div>

      <LinkButton
        href="/jargon/import"
        variant="outline"
        className="w-full shrink-0 justify-start gap-2 border-dashed"
        onPress={onDomainSelect}
      >
        <Plus className="size-4" aria-hidden strokeWidth={1.5} />
        Add collection
      </LinkButton>
    </nav>
  );
}
