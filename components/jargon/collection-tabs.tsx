"use client";

import { Link2, PauseCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Domain } from "@/lib/jargon/types";

type CollectionTabsProps = {
  domains: Domain[];
  currentDomainId: string;
};

export function CollectionTabs({ domains, currentDomainId }: CollectionTabsProps) {
  const router = useRouter();

  if (domains.length === 0) return null;

  return (
    <div className="relative -mx-5 border-b border-border px-5">
      <div className="flex gap-1 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {domains.map((domain) => {
          const isActive = domain.id === currentDomainId;

          return (
            <button
              key={domain.id}
              type="button"
              onClick={() => {
                if (!isActive) router.push(`/jargon?domain=${domain.id}`);
              }}
              className={`group flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] transition-colors ${
                isActive
                  ? "border-accent font-medium text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
              title={
                domain.source === "added"
                  ? `${domain.name} (added to your collection)`
                  : domain.name
              }
            >
              {domain.source === "added" ? (
                <Link2 className="h-3.5 w-3.5 shrink-0 text-muted/70" aria-label="Added" />
              ) : null}
              <span className="max-w-[160px] truncate">
                {domain.icon ? `${domain.icon} ` : ""}
                {domain.name}
              </span>
              <span
                className={`text-[11px] tabular-nums ${
                  isActive ? "text-muted" : "text-muted/60 group-hover:text-muted"
                }`}
              >
                {domain.knownCount}/{domain.termCount}
              </span>
              {!domain.isActiveForReview ? (
                <PauseCircle className="h-3.5 w-3.5 shrink-0 text-muted/50" aria-label="Paused" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
