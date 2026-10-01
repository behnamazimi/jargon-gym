"use client";

import { FinishTermsDialog } from "@/components/jargon/finish-terms-dialog";
import { UnfinishedBanner } from "@/components/jargon/unfinished-banner";
import type { UnfinishedTerm } from "@/lib/jargon/types";

type UnfinishedSectionProps = {
  terms: UnfinishedTerm[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
};

/** The "N terms to finish" prompt and the sheet that fills them in. */
export function UnfinishedSection({
  terms,
  isOpen,
  onOpenChange,
  onChanged,
}: UnfinishedSectionProps) {
  return (
    <>
      <UnfinishedBanner terms={terms} onFinish={() => onOpenChange(true)} />
      <FinishTermsDialog
        terms={terms}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onChanged={onChanged}
      />
    </>
  );
}
