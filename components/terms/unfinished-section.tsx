"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { UnfinishedBanner } from "@/components/terms/unfinished-banner";
import { useRequestsAvailable } from "@/components/requests/requests-availability";
import type { UnfinishedLibraryTerm } from "@/lib/terms/types";

const FinishTermsDialog = dynamic(() =>
  import("@/components/terms/finish-terms-dialog").then((mod) => mod.FinishTermsDialog),
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
        requestHref={canRequest ? `/app/import/request?definitions=${domainId}` : undefined}
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
