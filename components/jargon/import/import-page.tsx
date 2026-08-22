"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { confirmImport, validateImportJson } from "@/app/(private)/jargon/import/actions";
import type { ImportFailure, ImportPreview } from "@/lib/jargon/import/types";
import { ImportForm } from "@/components/jargon/import/import-form";
import { ImportFailurePanel } from "@/components/jargon/import/import-errors";
import { ImportPreviewPanel } from "@/components/jargon/import/import-preview";
import { ImportLlmPrompt } from "@/components/jargon/import/import-llm-prompt";
import type { OwnedCollectionForImport } from "@/lib/jargon/import/owned-collections";
import { PLATFORM_MEDIA } from "@/lib/platform";

type ImportPageClientProps = {
  collections: OwnedCollectionForImport[];
};

export function ImportPageClient({ collections }: ImportPageClientProps) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [failure, setFailure] = useState<ImportFailure | null>(null);
  const [isValidating, startValidate] = useTransition();
  const [isImporting, startImport] = useTransition();
  const [confirmReplace, setConfirmReplace] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!preview) return;

    const behavior = window.matchMedia(PLATFORM_MEDIA.reducedMotion).matches ? "instant" : "smooth";
    previewRef.current?.scrollIntoView({ block: "start", behavior });
  }, [preview]);

  function handleValidate() {
    setFailure(null);
    setPreview(null);
    setConfirmReplace(false);

    startValidate(async () => {
      const response = await validateImportJson(raw);

      if (!response.ok) {
        setFailure(response.failure);
        return;
      }

      setPreview(response.preview);
    });
  }

  function handleImport() {
    setFailure(null);

    startImport(async () => {
      const response = await confirmImport(raw, confirmReplace);

      if (!response.ok) {
        setFailure(response.failure);
      }
    });
  }

  return (
    <>
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
        <div
          ref={previewRef}
          className="scroll-mt-4 max-md:scroll-mt-[calc(3.5rem+env(safe-area-inset-top,0px))]"
        >
          <ImportPreviewPanel
            preview={preview}
            confirmReplace={confirmReplace}
            onConfirmReplaceChange={setConfirmReplace}
            onImport={handleImport}
            isImporting={isImporting}
          />
        </div>
      ) : null}
    </>
  );
}
