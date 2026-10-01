"use client";

import { FinishTermsDialog } from "@/components/jargon/finish-terms-dialog";
import { UnfinishedBanner } from "@/components/jargon/unfinished-banner";
import { useRequestsAvailable } from "@/components/requests/requests-availability";
import type { UnfinishedTerm } from "@/lib/jargon/types";

type UnfinishedSectionProps = {
  domainId: string;
  terms: UnfinishedTerm[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
};

/** The "N terms to finish" prompt and the sheet that fills them in. */
export function UnfinishedSection({
  domainId,
  terms,
  isOpen,
  onOpenChange,
  onChanged,
}: UnfinishedSectionProps) {
  const canRequest = useRequestsAvailable();
  return (
    <>
      <UnfinishedBanner
        terms={terms}
        onFinish={() => onOpenChange(true)}
        requestHref={canRequest ? `/jargon/import/request?definitions=${domainId}` : undefined}
      />
      <FinishTermsDialog
        terms={terms}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onChanged={onChanged}
      />
    </>
  );
}
