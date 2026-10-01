"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { UnfinishedBanner } from "@/components/jargon/unfinished-banner";
import { useRequestsAvailable } from "@/components/requests/requests-availability";
import type { UnfinishedLibraryTerm } from "@/lib/jargon/types";

const FinishTermsDialog = dynamic(() =>
  import("@/components/jargon/finish-terms-dialog").then((mod) => mod.FinishTermsDialog),
);

type UnfinishedSectionProps = {
  domainId: string;
  terms: UnfinishedLibraryTerm[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
};

/** The "N terms to finish" prompt and the sheet that fills them in. */
export function UnfinishedSection({
  domainId,
  terms,
  isOpen,
  onOpenChange,
  onRemoved,
}: UnfinishedSectionProps) {
  const canRequest = useRequestsAvailable();
  return (
    <>
      <UnfinishedBanner
        terms={terms}
        onFinish={() => onOpenChange(true)}
        requestHref={canRequest ? `/jargon/import/request?definitions=${domainId}` : undefined}
      />
      {isOpen ? (
        <Suspense fallback={null}>
          <FinishTermsDialog
            terms={terms}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            onRemoved={onRemoved}
          />
        </Suspense>
      ) : null}
    </>
  );
}
