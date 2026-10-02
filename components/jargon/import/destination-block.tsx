"use client";

import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CollectionSelect } from "@/components/jargon/collection-select";
import { LanguageToggle } from "@/components/jargon/language-toggle";
import type { DestinationMode } from "@/components/jargon/import/use-import-flow";
import type { ImportDestination } from "@/lib/jargon/import/import-collections";
import { findSimilarName } from "@/lib/jargon/import/similar-name";
import { DOMAIN_LANGUAGE_OPTIONS, type DomainLanguage } from "@/lib/jargon/languages";

type DestinationBlockProps = {
  collections: ImportDestination[];
  addedNames: string[];
  mode: DestinationMode;
  newName: string;
  language: DomainLanguage;
  existingId: string;
  disabled: boolean;
  /** What the pasted text looks like, for a soft hint. */
  guessedLanguage: DomainLanguage | null;
  fileLanguage: DomainLanguage | null;
  onModeChange: (mode: DestinationMode, existingId?: string) => void;
  onNameChange: (name: string) => void;
  onLanguageChange: (language: DomainLanguage) => void;
};

function languageLabel(language: DomainLanguage) {
  return DOMAIN_LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? language;
}

function languageHint(
  mode: DestinationMode,
  language: DomainLanguage,
  guessed: DomainLanguage | null,
  existingName: string | undefined,
): string | null {
  if (!guessed || guessed === language) return null;
  const guessedLabel = languageLabel(guessed);
  if (mode === "existing") {
    return `These terms look ${guessedLabel}, but ${existingName ? `"${existingName}"` : "this collection"} is set to ${languageLabel(language)}.`;
  }
  return guessed === "nl"
    ? "This list looks Dutch. Choose Dutch above if that's right."
    : "This list looks English. Choose English above if that's right.";
}

type NewFieldsProps = Pick<
  DestinationBlockProps,
  | "collections"
  | "addedNames"
  | "newName"
  | "language"
  | "disabled"
  | "fileLanguage"
  | "onModeChange"
  | "onNameChange"
  | "onLanguageChange"
>;

function NewCollectionFields({
  collections,
  addedNames,
  newName,
  language,
  disabled,
  fileLanguage,
  onModeChange,
  onNameChange,
  onLanguageChange,
}: NewFieldsProps) {
  const similar = findSimilarName(
    newName,
    collections.map((c) => c.name),
  );
  const similarCollection = similar && collections.find((c) => c.name === similar.name);
  const addedMatch = newName.trim()
    ? addedNames.find((name) => name.trim().toLowerCase() === newName.trim().toLowerCase())
    : undefined;

  return (
    <>
      <Field>
        <FieldLabel htmlFor="import-name">Name</FieldLabel>
        <Input
          id="import-name"
          value={newName}
          disabled={disabled}
          className="text-base"
          placeholder="e.g. Startup finance"
          onChange={(event) => onNameChange(event.target.value)}
        />
      </Field>
      {similar && similarCollection ? (
        <Alert>
          <AlertDescription>
            You already have &ldquo;{similar.name}&rdquo;. Add to it instead?
          </AlertDescription>
          <AlertAction>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onPress={() => onModeChange("existing", similarCollection.id)}
            >
              Add to it
            </Button>
          </AlertAction>
        </Alert>
      ) : null}
      {addedMatch ? (
        <p className="m-0 text-sm text-base-content/70" role="status">
          You added a shared collection called &ldquo;{addedMatch}&rdquo;. This creates your own.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Language</span>
        <LanguageToggle value={language} onChange={onLanguageChange} isDisabled={disabled} />
      </div>
      {fileLanguage && fileLanguage !== language ? (
        <p className="m-0 text-sm text-base-content/70" role="status">
          The file says {languageLabel(fileLanguage)}, you chose {languageLabel(language)}.
          We&apos;ll use your choice.
        </p>
      ) : null}
    </>
  );
}

export function DestinationBlock({
  collections,
  addedNames,
  mode,
  newName,
  language,
  existingId,
  disabled,
  guessedLanguage,
  fileLanguage,
  onModeChange,
  onNameChange,
  onLanguageChange,
}: DestinationBlockProps) {
  const existing = collections.find((collection) => collection.id === existingId);
  const effectiveLanguage = mode === "existing" && existing ? existing.language : language;
  const hint = languageHint(mode, effectiveLanguage, guessedLanguage, existing?.name);

  return (
    <div className="space-y-3">
      <ToggleGroup
        aria-label="Where to add"
        selectionMode="single"
        disallowEmptySelection
        isDisabled={disabled}
        selectedKeys={[mode]}
        onSelectionChange={(keys) => {
          const [key] = [...keys];
          if (key === "new" || key === "existing") onModeChange(key);
        }}
        className="w-full"
      >
        <ToggleGroupItem id="new" className="flex-1">
          New collection
        </ToggleGroupItem>
        <ToggleGroupItem id="existing" className="flex-1" isDisabled={collections.length === 0}>
          Add to existing
        </ToggleGroupItem>
      </ToggleGroup>

      {mode === "new" ? (
        <>
          <NewCollectionFields
            collections={collections}
            addedNames={addedNames}
            newName={newName}
            language={language}
            disabled={disabled}
            fileLanguage={fileLanguage}
            onModeChange={onModeChange}
            onNameChange={onNameChange}
            onLanguageChange={onLanguageChange}
          />
        </>
      ) : (
        <>
          <Field>
            <FieldLabel htmlFor="import-existing">Collection</FieldLabel>
            <CollectionSelect
              id="import-existing"
              mode="local"
              collections={collections.map((c) => ({
                id: c.id,
                name: c.name,
                termCount: c.termCount,
              }))}
              value={existingId}
              isDisabled={disabled}
              className="w-full"
              onChange={(id) => onModeChange("existing", id)}
            />
          </Field>
          {existing ? (
            <p className="m-0 text-sm text-base-content/70">
              Language: {languageLabel(existing.language)} (set by this collection)
            </p>
          ) : null}
        </>
      )}

      {hint ? (
        <p className="m-0 text-sm text-base-content/70" role="status">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
