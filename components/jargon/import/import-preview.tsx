import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
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
    <Card className="ring-base-content/5">
      <CardContent>
        <h2 className="font-heading text-base font-semibold">Preview</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-base-content/60">Domain</dt>
            <dd className="font-medium">{preview.domain}</dd>
          </div>
          <div>
            <dt className="text-base-content/60">Mode</dt>
            <dd className="font-medium">
              {preview.isMerge ? "Merge into existing" : "Create new"}
            </dd>
          </div>
          <div>
            <dt className="text-base-content/60">Terms</dt>
            <dd className="font-medium">{preview.termCount}</dd>
          </div>
          <div>
            <dt className="text-base-content/60">Relationships</dt>
            <dd className="font-medium">{preview.relationshipCount}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-base-content/60">
          Categories: {preview.categories.join(", ")}
        </p>

        {hasConflicts ? (
          <Alert className="mt-4">
            <AlertTriangle className="size-4" />
            <AlertTitle>
              {pluralize(conflictCount, "existing term", "existing terms")} will be replaced
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                These names already exist in &ldquo;{preview.domain}&rdquo;. Importing will
                overwrite their definitions and other fields with the imported data.
              </p>
              <ul className="list-disc space-y-1 pl-5">
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
            </AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="button"
          onPress={onImport}
          isDisabled={isImporting || !canImport}
          className="mt-4"
        >
          {isImporting ? "Importing…" : confirmLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
