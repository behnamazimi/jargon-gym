"use client";

import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Domain } from "@/lib/jargon/types";
import { CollectionTabs } from "./collection-tabs";
import { DomainActionsMenu, DomainMeta } from "./domain-actions-menu";

type HeaderProps = {
  domain: Domain;
  domains: Domain[];
  categoryCount: number;
  isOwner?: boolean;
  onAddTerm?: () => void;
};

export function Header({
  domain,
  domains,
  categoryCount,
  isOwner = false,
  onAddTerm,
}: HeaderProps) {
  return (
    <header>
      <Card className="gap-0 p-0 ring-foreground/5">
        <CollectionTabs domains={domains} currentDomainId={domain.id} />

        <CardContent className="flex items-start justify-between gap-3 px-4 py-3">
          <DomainMeta domain={domain} categoryCount={categoryCount} />
          <div className="flex shrink-0 items-center gap-1">
            {isOwner && onAddTerm ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Add term"
                onPress={onAddTerm}
              >
                <Plus className="size-5" />
              </Button>
            ) : null}
            <DomainActionsMenu domain={domain} domains={domains} />
          </div>
        </CardContent>
      </Card>
    </header>
  );
}
