"use client";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { CheckStep } from "@/components/jargon/import/check-step";
import { PasteStep } from "@/components/jargon/import/paste-step";
import { useImportFlow } from "@/components/jargon/import/use-import-flow";
import type { ImportDestination } from "@/lib/jargon/import/import-collections";
import type { CommitImportInput } from "@/lib/jargon/import/commit-schema";

type ImportFlowProps = {
  collections: ImportDestination[];
  addedNames: string[];
  presetDomainId?: string;
  entry: CommitImportInput["entry"];
  /** Go straight to Check, for a list that was pasted somewhere else. */
  autoCheck?: boolean;
};

/** Paste a list, check it, add it. */
export function ImportFlow({
  collections,
  addedNames,
  presetDomainId,
  entry,
  autoCheck = false,
}: ImportFlowProps) {
  const flow = useImportFlow({ collections, presetDomainId, entry });
  useMountEffect(() => {
    if (autoCheck && flow.draft) flow.checkText(flow.draft, undefined);
  });

  if (flow.step === "check") return <CheckStep flow={flow} addedNames={addedNames} />;

  return (
    <PasteStep
      draft={flow.draft}
      problem={flow.problem}
      onTextChange={(text) => {
        flow.clearProblem();
        flow.setDraftText(text);
      }}
      onCheck={(text, html) => flow.checkText(text, html)}
      onTreatAsText={() => {
        flow.checkText(flow.draft, flow.html, { ...flow.options, treatAsText: true });
      }}
      onProblem={(message) => flow.setProblem({ message })}
    />
  );
}
