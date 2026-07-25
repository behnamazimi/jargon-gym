"use client";

import { Card, CardContent } from "@/components/ui/card";
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
    <header>
      <Card className="gap-0 p-0 ring-foreground/5">
        <CollectionTabs domains={domains} currentDomainId={domain.id} />

        <CardContent className="flex items-start justify-between gap-3 px-4 py-3">
          <DomainMeta domain={domain} categoryCount={categoryCount} />
          <DomainActionsMenu domain={domain} domains={domains} />
        </CardContent>
      </Card>
    </header>
  );
}
