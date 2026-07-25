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

export function ImportPageClient() {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [failure, setFailure] = useState<ImportFailure | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  async function handleValidate() {
    setIsValidating(true);
    setFailure(null);
    setPreview(null);

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

    const response = await confirmImport(raw);

    setIsImporting(false);

    if (!response.ok) {
      setFailure(response.failure);
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-primary/[0.06] via-background to-background text-foreground">
      <div className="mx-auto max-w-[720px] space-y-5 px-5 py-7 pb-20">
        <PageHeader
          icon={Upload}
          title="Import jargon"
          description="Paste JSON to create or merge into one of your owned domains."
          backLabel="Back to jargon"
        />

        <div className="space-y-4">
          <ImportLlmPrompt />
          <ImportForm
            value={raw}
            onChange={setRaw}
            onValidate={handleValidate}
            isValidating={isValidating}
            onFailure={setFailure}
          />
        </div>

        {failure ? <ImportFailurePanel failure={failure} /> : null}

        {preview ? (
          <ImportPreviewPanel preview={preview} onImport={handleImport} isImporting={isImporting} />
        ) : null}
      </div>
    </div>
  );
}
