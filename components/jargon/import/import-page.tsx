"use client";

import { useState } from "react";
import Link from "next/link";
import { confirmImport, validateImportJson } from "@/app/(private)/jargon/import/actions";
import type { ImportFailure, ImportPreview } from "@/lib/jargon/import/types";
import { ImportForm } from "@/components/jargon/import/import-form";
import { ImportFailurePanel } from "@/components/jargon/import/import-errors";
import { ImportPreviewPanel } from "@/components/jargon/import/import-preview";
import { ImportLlmPrompt } from "@/components/jargon/import/import-llm-prompt";

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
    <div className="mx-auto max-w-[720px] px-5 py-7">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-bold tracking-tight">
            <span className="text-accent">Import</span> jargon
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Paste JSON to create or merge into one of your owned domains.
          </p>
        </div>
        <Link
          href="/jargon"
          className="text-[13px] font-medium text-accent underline-offset-2 hover:underline"
        >
          Back to jargon
        </Link>
      </div>

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
  );
}
