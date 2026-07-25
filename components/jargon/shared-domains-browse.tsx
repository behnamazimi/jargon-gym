"use client";

import { BookmarkMinus, CheckCircle2, Compass, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/jargon/page-header";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import type { SharedDomain } from "@/lib/jargon/types";

type SharedDomainsBrowseProps = {
  domains: SharedDomain[];
};

export function SharedDomainsBrowse({ domains }: SharedDomainsBrowseProps) {
  const { error, busyId, addToCollection, removeFromCollection } = useCollectionActions();

  return (
    <div className="min-h-full bg-gradient-to-b from-primary/[0.06] via-background to-background text-foreground">
      <div className="mx-auto max-w-[720px] space-y-5 px-5 py-7 pb-20">
        <PageHeader
          icon={Compass}
          title="Browse shared domains"
          description="Add a shared domain to your collection to study it alongside your own imports."
          backLabel="Back to jargon"
        />

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shared domains available yet.</p>
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
                        {domain.termCount} terms
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
      </div>
    </div>
  );
}
