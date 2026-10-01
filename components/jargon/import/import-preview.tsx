"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ImportCard } from "@/components/jargon/import/import-ui";
import { LanguageToggle } from "@/components/jargon/language-toggle";
import { DangerZone } from "@/components/jargon/settings/ui";
import { findSimilarName } from "@/lib/jargon/import/similar-name";
import type { ImportPreview } from "@/lib/jargon/import/types";
import { DOMAIN_LANGUAGE_OPTIONS, type DomainLanguage } from "@/lib/jargon/languages";
import { pluralize } from "@/lib/utils";

type ImportPreviewPanelProps = {
  preview: ImportPreview;
  ownedNames: string[];
  language: DomainLanguage;
  onLanguageChange: (language: DomainLanguage) => void;
  onNameCommit: (name: string) => void;
  confirmReplace: boolean;
  onConfirmReplaceChange: (value: boolean) => void;
  onImport: () => void;
  isImporting: boolean;
  isChecking: boolean;
};

function languageLabel(language: DomainLanguage) {
  return DOMAIN_LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? language;
}

function summaryText(preview: ImportPreview) {
  const counts = `${pluralize(preview.termCount, "term")} and ${pluralize(preview.relationshipCount, "link")}`;
  return preview.isMerge
    ? `${counts}. Adding to your existing "${preview.domain}".`
    : `${counts}. Creating a new collection.`;
}

function confirmButtonLabel(termCount: number, conflictCount: number) {
  const base = `Add ${pluralize(termCount, "term")}`;
  return conflictCount > 0 ? `${base} and replace ${conflictCount}` : base;
}

function LanguageSection({
  preview,
  language,
  onLanguageChange,
  isChecking,
}: {
  preview: ImportPreview;
  language: DomainLanguage;
  onLanguageChange: (language: DomainLanguage) => void;
  isChecking: boolean;
}) {
  if (preview.isMerge && preview.domainLanguage) {
    return (
      <p className="m-0 text-sm text-base-content/60">
        Language: {languageLabel(preview.domainLanguage)} (set by this collection)
      </p>
    );
  }

  return (
    <Field>
      <FieldLabel>Language</FieldLabel>
      <LanguageToggle value={language} onChange={onLanguageChange} isDisabled={isChecking} />
    </Field>
  );
}

function NameGuard({
  existingName,
  onUseExisting,
  onKeepMine,
}: {
  existingName: string;
  onUseExisting: () => void;
  onKeepMine: () => void;
}) {
  return (
    <Alert>
      <AlertDescription>
        You already have &ldquo;{existingName}&rdquo;. Add to it instead?
      </AlertDescription>
      <AlertAction>
        <Button type="button" size="sm" className="min-h-11 md:min-h-8" onPress={onUseExisting}>
          Use &ldquo;{existingName}&rdquo;
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 md:min-h-8"
          onPress={onKeepMine}
        >
          Keep my name
        </Button>
      </AlertAction>
    </Alert>
  );
}

function ConflictBlock({
  conflicts,
  confirmReplace,
  onConfirmReplaceChange,
}: {
  conflicts: string[];
  confirmReplace: boolean;
  onConfirmReplaceChange: (value: boolean) => void;
}) {
  const count = conflicts.length;

  return (
    <DangerZone
      title={`${pluralize(count, "term")} ${count === 1 ? "is" : "are"} already in this collection`}
      description="Importing replaces their definitions and details. Your progress on them is kept."
    >
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {conflicts.map((term) => (
          <li key={term}>{term}</li>
        ))}
      </ul>
      <Field orientation="horizontal" className="items-start gap-2">
        <Checkbox
          id="confirm-replace-terms"
          isSelected={confirmReplace}
          onChange={onConfirmReplaceChange}
          className="checkbox-xs"
        />
        <FieldLabel htmlFor="confirm-replace-terms" className="text-sm font-normal leading-relaxed">
          Replace {pluralize(count, "term")} with the imported ones
        </FieldLabel>
      </Field>
    </DangerZone>
  );
}

export function ImportPreviewPanel({
  preview,
  ownedNames,
  language,
  onLanguageChange,
  onNameCommit,
  confirmReplace,
  onConfirmReplaceChange,
  onImport,
  isImporting,
  isChecking,
}: ImportPreviewPanelProps) {
  const [typedName, setTypedName] = useState(preview.domain);
  const [keptName, setKeptName] = useState<string | null>(null);

  const conflictCount = preview.conflictingTerms.length;
  const hasConflicts = conflictCount > 0;
  const nameIsPending = typedName.trim() !== preview.domain;
  const canImport = (!hasConflicts || confirmReplace) && !nameIsPending && !isChecking;

  const similar = preview.isMerge ? null : findSimilarName(preview.domain, ownedNames);
  const showGuard = similar?.kind === "near" && keptName !== preview.domain;

  const confirmLabel = confirmButtonLabel(preview.termCount, conflictCount);

  function commitName(name: string) {
    const trimmed = name.trim();
    if (trimmed && trimmed !== preview.domain) onNameCommit(trimmed);
  }

  function useExistingName(name: string) {
    setTypedName(name);
    onNameCommit(name);
  }

  return (
    <ImportCard icon={CheckCircle2} title="Check before adding">
      <p role="status" className="m-0 mb-1 text-sm text-base-content/80">
        {isChecking ? "Checking…" : summaryText(preview)}
      </p>

      <Field>
        <FieldLabel htmlFor="import-collection-name">Collection name</FieldLabel>
        <Input
          id="import-collection-name"
          value={typedName}
          className="text-base"
          onChange={(event) => setTypedName(event.target.value)}
          onBlur={(event) => commitName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitName(event.currentTarget.value);
          }}
        />
      </Field>

      {showGuard && similar ? (
        <NameGuard
          existingName={similar.name}
          onUseExisting={() => useExistingName(similar.name)}
          onKeepMine={() => setKeptName(preview.domain)}
        />
      ) : null}

      <LanguageSection
        preview={preview}
        language={language}
        onLanguageChange={onLanguageChange}
        isChecking={isChecking}
      />

      {hasConflicts ? (
        <ConflictBlock
          conflicts={preview.conflictingTerms}
          confirmReplace={confirmReplace}
          onConfirmReplaceChange={onConfirmReplaceChange}
        />
      ) : null}

      <Button
        type="button"
        onPress={onImport}
        isDisabled={isImporting || !canImport}
        className="min-h-11 w-full md:w-auto"
      >
        {isImporting ? "Adding…" : confirmLabel}
      </Button>
    </ImportCard>
  );
}
