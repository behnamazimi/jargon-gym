import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { ImportCard } from "@/components/jargon/import/import-ui";
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

function previewDescription(preview: ImportPreview) {
  const counts = `${pluralize(preview.termCount, "term")} and ${pluralize(preview.relationshipCount, "relationship")}`;
  const inCategories = preview.categories.length > 0 ? ` in ${preview.categories.join(", ")}` : "";

  return preview.isMerge
    ? `Merge ${counts}${inCategories} into your existing "${preview.domain}" collection.`
    : `Create a new "${preview.domain}" collection with ${counts}${inCategories}.`;
}

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
      icon={CheckCircle2}
      title="Review & import"
      description={previewDescription(preview)}
    >
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
      ) : null}

      <Button
        type="button"
        onPress={onImport}
        isDisabled={isImporting || !canImport}
        className="min-h-11 w-full md:w-auto"
      >
        {isImporting ? "Importing…" : confirmLabel}
      </Button>
    </ImportCard>
  );
}
