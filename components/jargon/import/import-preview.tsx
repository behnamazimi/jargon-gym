import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ImportPreview } from "@/lib/jargon/import/types";

type ImportPreviewPanelProps = {
  preview: ImportPreview;
  onImport: () => void;
  isImporting: boolean;
};

export function ImportPreviewPanel({ preview, onImport, isImporting }: ImportPreviewPanelProps) {
  return (
    <Card className="ring-foreground/5">
      <CardContent>
        <h2 className="font-heading text-base font-semibold">Preview</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Domain</dt>
            <dd className="font-medium">{preview.domain}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Mode</dt>
            <dd className="font-medium">
              {preview.isMerge ? "Merge into existing" : "Create new"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Terms</dt>
            <dd className="font-medium">{preview.termCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Relationships</dt>
            <dd className="font-medium">{preview.relationshipCount}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-muted-foreground">
          Categories: {preview.categories.join(", ")}
        </p>
        <Button type="button" onPress={onImport} isDisabled={isImporting} className="mt-4">
          {isImporting ? "Importing…" : "Confirm import"}
        </Button>
      </CardContent>
    </Card>
  );
}
