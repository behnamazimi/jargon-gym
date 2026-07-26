"use client";

import { BookmarkMinus, CheckCircle2, Compass, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/jargon/empty-state";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import type { SharedDomain } from "@/lib/jargon/types";
import { pluralize } from "@/lib/utils";

type SharedDomainsBrowseProps = {
  domains: SharedDomain[];
};

export function SharedDomainsBrowse({ domains }: SharedDomainsBrowseProps) {
  const { error, busyId, addToCollection, removeFromCollection } = useCollectionActions();

  return (
    <PageShell>
      <PageHeader
        icon={Compass}
        title="Browse shared domains"
        description="Add a shared domain to your collection to study it alongside your own imports."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {domains.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No shared domains yet"
          description="When someone shares a domain, it will appear here so you can add it to your collection."
          className="py-10"
        />
      ) : (
        <ul className="space-y-3">
          {domains.map((domain) => (
            <li key={domain.id}>
              <Card className="ring-foreground/5">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-heading text-base font-semibold">
                      {domain.icon ? `${domain.icon} ` : ""}
                      {domain.name}
                    </div>
                    {domain.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{domain.description}</p>
                    ) : null}
                    <div className="mt-1 text-sm text-muted-foreground">
                      {pluralize(domain.termCount, "term")}
                    </div>
                  </div>

                  {domain.inCollection ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        In collection
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onPress={() => removeFromCollection(domain.id)}
                        isDisabled={busyId === domain.id}
                      >
                        <BookmarkMinus className="h-4 w-4" />
                        {busyId === domain.id ? "Removing…" : "Remove"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onPress={() => addToCollection(domain.id)}
                      isDisabled={busyId === domain.id}
                    >
                      <Plus className="h-4 w-4" />
                      {busyId === domain.id ? "Adding…" : "Add to collection"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
