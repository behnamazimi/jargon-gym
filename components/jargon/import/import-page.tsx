"use client";

import { ChevronDown, FolderPlus } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { confirmImport, validateImportJson } from "@/app/(private)/jargon/import/actions";
import type { ImportFailure, ImportPreview } from "@/lib/jargon/import/types";
import { ImportForm } from "@/components/jargon/import/import-form";
import { ImportFailurePanel } from "@/components/jargon/import/import-errors";
import { ImportPreviewPanel } from "@/components/jargon/import/import-preview";
import { ImportLlmPrompt } from "@/components/jargon/import/import-llm-prompt";
import { ImportCard } from "@/components/jargon/import/import-ui";
import { CreateCollectionDialog } from "@/components/jargon/create-collection-dialog";
import { Button } from "@/components/ui/button";
import type { DomainLanguage } from "@/lib/jargon/languages";
import type { OwnedCollectionForImport } from "@/lib/jargon/import/owned-collections";
import { PLATFORM_MEDIA } from "@/lib/platform";
import { cn } from "@/lib/utils";

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
  const [nameOverride, setNameOverride] = useState<string | undefined>();
  const [language, setLanguage] = useState<DomainLanguage>("en");
  const [createOpen, setCreateOpen] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const revealPreview = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;

    const behavior = window.matchMedia(PLATFORM_MEDIA.reducedMotion).matches ? "instant" : "smooth";
    element.scrollIntoView({ block: "start", behavior });
    element.focus({ preventScroll: true });
  }, []);

  function runCheck(domainName: string | undefined) {
    setFailure(null);
    setConfirmReplace(false);

    startValidate(async () => {
      const response = await validateImportJson(raw, { domainName, language });

      if (!response.ok) {
        setFailure(response.failure);
        return;
      }

      setPreview(response.preview);
    });
  }

  function handleValidate() {
    setPreview(null);
    setNameOverride(undefined);
    runCheck(undefined);
  }

  function handleNameCommit(name: string) {
    setNameOverride(name);
    runCheck(name);
  }

  function handleImport() {
    setFailure(null);

    startImport(async () => {
      const response = await confirmImport(raw, confirmReplace, {
        domainName: nameOverride,
        language,
      });

      if (!response.ok) {
        setFailure(response.failure);
      }
    });
  }

  return (
    <>
      <ImportCard
        icon={FolderPlus}
        title="Start an empty collection"
        description="Name it, pick a language, then add terms one at a time."
      >
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full md:w-auto"
          onPress={() => setCreateOpen(true)}
        >
          Start an empty collection
        </Button>
      </ImportCard>

      <ImportForm
        value={raw}
        onChange={setRaw}
        onValidate={handleValidate}
        isValidating={isValidating && !preview}
        onFailure={setFailure}
      />

      {failure ? <ImportFailurePanel failure={failure} /> : null}

      {preview ? (
        <div
          ref={revealPreview}
          tabIndex={-1}
          role="region"
          aria-label="Check before adding"
          className="scroll-mt-4 outline-none max-md:scroll-mt-[calc(3.5rem+env(safe-area-inset-top,0px))]"
        >
          <ImportPreviewPanel
            key={preview.domain}
            preview={preview}
            ownedNames={collections.map((collection) => collection.name)}
            language={language}
            onLanguageChange={setLanguage}
            onNameCommit={handleNameCommit}
            confirmReplace={confirmReplace}
            onConfirmReplaceChange={setConfirmReplace}
            onImport={handleImport}
            isImporting={isImporting}
            isChecking={isValidating}
          />
        </div>
      ) : null}

      <div className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 gap-1.5 text-base-content/60"
          aria-expanded={showMoreOptions}
          onPress={() => setShowMoreOptions((open) => !open)}
        >
          More import options
          <ChevronDown
            className={cn(
              "size-4 transition-transform motion-reduce:transition-none",
              showMoreOptions && "rotate-180",
            )}
            aria-hidden
            strokeWidth={1.5}
          />
        </Button>
        {showMoreOptions ? <ImportLlmPrompt collections={collections} /> : null}
      </div>

      <CreateCollectionDialog
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        existingCollections={collections}
      />
    </>
  );
}
