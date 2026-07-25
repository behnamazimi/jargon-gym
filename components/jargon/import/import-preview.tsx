import type { ImportPreview } from "@/lib/jargon/import/types";

type ImportPreviewPanelProps = {
  preview: ImportPreview;
  onImport: () => void;
  isImporting: boolean;
};

export function ImportPreviewPanel({ preview, onImport, isImporting }: ImportPreviewPanelProps) {
  return (
    <div className="mt-6 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <h2 className="m-0 text-[15px] font-semibold">Preview</h2>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
        <div>
          <dt className="text-muted">Domain</dt>
          <dd className="font-medium">{preview.domain}</dd>
        </div>
        <div>
          <dt className="text-muted">Mode</dt>
          <dd className="font-medium">{preview.isMerge ? "Merge into existing" : "Create new"}</dd>
        </div>
        <div>
          <dt className="text-muted">Terms</dt>
          <dd className="font-medium">{preview.termCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Relationships</dt>
          <dd className="font-medium">{preview.relationshipCount}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[13px] text-muted">Categories: {preview.categories.join(", ")}</p>
      <button
        type="button"
        onClick={onImport}
        disabled={isImporting}
        className="mt-4 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isImporting ? "Importing…" : "Confirm import"}
      </button>
    </div>
  );
}
