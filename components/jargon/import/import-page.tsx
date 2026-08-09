"use client";

import { Upload } from "lucide-react";
import { useState } from "react";
import { confirmImport, validateImportJson } from "@/app/(private)/jargon/import/actions";
import type { ImportFailure, ImportPreview } from "@/lib/jargon/import/types";
import { ImportForm } from "@/components/jargon/import/import-form";
import { ImportFailurePanel } from "@/components/jargon/import/import-errors";
import { ImportPreviewPanel } from "@/components/jargon/import/import-preview";
import { ImportLlmPrompt } from "@/components/jargon/import/import-llm-prompt";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";
import type { OwnedCollectionForImport } from "@/lib/jargon/import/owned-collections";

type ImportPageClientProps = {
  collections: OwnedCollectionForImport[];
};

export function ImportPageClient({ collections }: ImportPageClientProps) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [failure, setFailure] = useState<ImportFailure | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  async function handleValidate() {
    setIsValidating(true);
    setFailure(null);
    setPreview(null);
    setConfirmReplace(false);

    const response = await validateImportJson(raw);

    setIsValidating(false);

    if (!response.ok) {
      setFailure(response.failure);
      return;
    }

    setPreview(response.preview);
  }

  async function handleImport() {
    setIsImporting(true);
    setFailure(null);

    const response = await confirmImport(raw, confirmReplace);

    setIsImporting(false);

    if (!response.ok) {
      setFailure(response.failure);
    }
  }

  return (
    <PageShell innerClassName="landing-enter space-y-6">
      <PageHeader
        icon={Upload}
        title="Import jargon"
        description="Paste or upload JSON to add terms to a collection."
      />

      <ImportLlmPrompt collections={collections} />
      <ImportForm
        value={raw}
        onChange={setRaw}
        onValidate={handleValidate}
        isValidating={isValidating}
        onFailure={setFailure}
      />

      {failure ? <ImportFailurePanel failure={failure} /> : null}

      {preview ? (
        <ImportPreviewPanel
          preview={preview}
          confirmReplace={confirmReplace}
          onConfirmReplaceChange={setConfirmReplace}
          onImport={handleImport}
          isImporting={isImporting}
        />
      ) : null}
    </PageShell>
  );
}
