import { CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { ImportCard, ImportCategoryBadges, ImportStat } from "@/components/jargon/import/import-ui";
import { DangerZone } from "@/components/jargon/settings/ui";
import type { ImportPreview } from "@/lib/jargon/import/types";
import { pluralize } from "@/lib/utils";

type ImportPreviewPanelProps = {
  preview: ImportPreview;
  confirmReplace: boolean;
  onConfirmReplaceChange: (value: boolean) => void;
  onImport: () => void;
  isImporting: boolean;
};

export function ImportPreviewPanel({
  preview,
  confirmReplace,
  onConfirmReplaceChange,
  onImport,
  isImporting,
}: ImportPreviewPanelProps) {
  const conflictCount = preview.conflictingTerms.length;
  const hasConflicts = conflictCount > 0;
  const canImport = !hasConflicts || confirmReplace;

  const confirmLabel = hasConflicts
    ? `Replace ${pluralize(conflictCount, "term")} and import`
    : "Confirm import";

  return (
    <ImportCard
      step={3}
      icon={CheckCircle2}
      title="Review & import"
      description={
        preview.isMerge
          ? `Merge ${pluralize(preview.termCount, "term")} into your existing "${preview.domain}" collection.`
          : `Create a new "${preview.domain}" collection with ${pluralize(preview.termCount, "term")}.`
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={preview.isMerge ? "secondary" : "default"}>
          {preview.isMerge ? "Merge into existing" : "Create new collection"}
        </Badge>
        <span className="text-sm font-medium">{preview.domain}</span>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <ImportStat label="Terms" value={preview.termCount} variant="primary" />
        <ImportStat label="Relationships" value={preview.relationshipCount} />
        <ImportStat label="Categories" value={preview.categories.length} />
      </dl>

      {preview.categories.length > 0 ? (
        <div className="space-y-2">
          <p className="m-0 text-xs font-medium text-base-content/60">Categories</p>
          <ImportCategoryBadges categories={preview.categories} />
        </div>
      ) : null}

      {hasConflicts ? (
        <DangerZone
          title={`This will overwrite ${pluralize(conflictCount, "term")} you already have`}
          description="These names already exist in this collection. Importing replaces their definitions and other fields."
        >
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {preview.conflictingTerms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
          <Field orientation="horizontal" className="items-start gap-2">
            <Checkbox
              id="confirm-replace-terms"
              isSelected={confirmReplace}
              onChange={onConfirmReplaceChange}
            />
            <FieldLabel
              htmlFor="confirm-replace-terms"
              className="text-sm font-normal leading-relaxed"
            >
              Replace {pluralize(conflictCount, "term")} with the imported data
            </FieldLabel>
          </Field>
        </DangerZone>
      ) : (
        <Alert>
          <CheckCircle2 className="size-4" strokeWidth={1.5} />
          <AlertTitle>Ready to import</AlertTitle>
          <AlertDescription>No conflicts — you're good to import.</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        onPress={onImport}
        isDisabled={isImporting || !canImport}
        className="w-full md:w-auto"
      >
        {isImporting ? "Importing…" : confirmLabel}
      </Button>
    </ImportCard>
  );
}
