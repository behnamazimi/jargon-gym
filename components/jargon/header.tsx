"use client";

import type { Domain } from "@/lib/jargon/types";
import { CollectionTabs } from "./collection-tabs";
import { DomainActionsMenu, DomainMeta } from "./domain-actions-menu";

type HeaderProps = {
  domain: Domain;
  domains: Domain[];
  categoryCount: number;
};

export function Header({ domain, domains, categoryCount }: HeaderProps) {
  return (
    <header className="mb-5">
      <CollectionTabs domains={domains} currentDomainId={domain.id} />

      <div className="mt-3 flex items-start justify-between gap-3">
        <DomainMeta domain={domain} categoryCount={categoryCount} />
        <DomainActionsMenu domain={domain} domains={domains} />
      </div>
    </header>
  );
}
