"use client";

import { ArrowRight, CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { pluralize } from "@/lib/utils";
import { dropImportedParamFromUrl } from "./jargon-page-helpers";

type ImportedNotice = { count: number; domainId: string };

/** Holds the post-import confirmation for the collection it was for, and
 *  drops ?imported= so a reload or shared link doesn't repeat it. */
export function useImportedNotice(importedCount: number | undefined, domainId: string) {
  const [notice, setNotice] = useState<ImportedNotice | null>(
    importedCount === undefined ? null : { count: importedCount, domainId },
  );
  useEffect(() => {
    if (importedCount !== undefined) dropImportedParamFromUrl();
  }, [importedCount]);
  return { notice, dismiss: () => setNotice(null) };
}

/** One-time confirmation after an import lands on its collection. */
export function ImportedBanner({
  notice,
  domain,
  onDismiss,
}: {
  notice: ImportedNotice | null;
  domain: { id: string; name: string };
  onDismiss: () => void;
}) {
  if (!notice || notice.domainId !== domain.id) return null;

  return (
    <Alert variant="success">
      <CheckCircle2 className="size-4" aria-hidden strokeWidth={1.5} />
      <AlertDescription>
        Imported {pluralize(notice.count, "term")} into {domain.name}.
      </AlertDescription>
      <AlertAction>
        {/* Imports always mark the collection active, so Read can open on it. */}
        <LinkButton
          href={`/jargon/read?domain=${domain.id}`}
          size="sm"
          className="min-h-11 gap-1.5 md:min-h-8"
        >
          Start reading
          <ArrowRight className="size-4" aria-hidden strokeWidth={1.5} />
        </LinkButton>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Dismiss"
          className="size-11 md:size-8"
          onPress={onDismiss}
        >
          <X className="size-4" aria-hidden strokeWidth={1.5} />
        </Button>
      </AlertAction>
    </Alert>
  );
}
