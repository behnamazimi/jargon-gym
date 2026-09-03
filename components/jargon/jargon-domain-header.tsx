"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Domain, Term } from "@/lib/jargon/types";
import { DomainActionsMenu, DomainMeta } from "./domain-actions-menu";

type JargonDomainHeaderProps = {
  domain: Domain;
  domains: Domain[];
  terms: Term[];
  categoryCount: number;
  isOwner?: boolean;
  onAddTerm?: () => void;
};

export function JargonDomainHeader({
  domain,
  domains,
  terms,
  categoryCount,
  isOwner = false,
  onAddTerm,
}: JargonDomainHeaderProps) {
  const progressPct =
    domain.termCount > 0 ? Math.round((domain.termsLearnedCount / domain.termCount) * 100) : 0;

  return (
    <header className="shadow-surface space-y-4 rounded-2xl bg-base-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="font-heading truncate text-xl font-semibold tracking-tight">
            {domain.icon ? `${domain.icon} ` : ""}
            {domain.name}
          </h1>
          {domain.termCount > 0 ? (
            <p className="text-sm tabular-nums text-base-content/60">
              {domain.termsLearnedCount} of {domain.termCount} learned · {progressPct}%
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {isOwner && onAddTerm ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-base-content/60 hover:text-base-content"
              aria-label="Add term"
              onPress={onAddTerm}
            >
              <Plus className="size-5" strokeWidth={1.5} />
            </Button>
          ) : null}
          <DomainActionsMenu domain={domain} domains={domains} terms={terms} />
        </div>
      </div>

      <DomainMeta domain={domain} categoryCount={categoryCount} />
    </header>
  );
}
