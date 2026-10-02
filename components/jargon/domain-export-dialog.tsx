"use client";

import { Download } from "lucide-react";
import { Suspense, use, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImportCodePanel } from "@/components/jargon/import/import-ui";
import { CopyIconSwap } from "@/components/jargon/settings/ui";
import {
  buildImportPayloadFromCollection,
  exportFilename,
} from "@/lib/jargon/export/build-import-payload";
import { stringifyImportPayload } from "@/lib/jargon/import/sample-payload";
import { collectionToCsv, collectionToText } from "@/lib/jargon/export/build-text-export";
import type { CollectionExport } from "@/lib/jargon/export/fetch-collection-export";
import type { Domain, Term } from "@/lib/jargon/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SkeletonBar } from "@/components/page-skeleton";

type DomainExportDialogProps = {
  domain: Domain;
  /** Started when the dialog was opened; the full terms load only for export. */
  terms: Promise<CollectionExport>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Mounted only while open, so its state starts fresh every time. */
export function DomainExportDialog({
  domain,
  terms,
  isOpen,
  onOpenChange,
}: DomainExportDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Export collection</DialogTitle>
        <DialogDescription>
          Export &ldquo;{domain.name}&rdquo; as JSON. Copy it or download a file you can re-import
          later.
        </DialogDescription>
      </DialogHeader>
      <Suspense
        fallback={
          <div className="space-y-2 py-4" aria-busy="true" aria-label="Loading collection">
            <SkeletonBar className="h-40 w-full rounded-field" />
          </div>
        }
      >
        <ExportBody domain={domain} terms={terms} onOpenChange={onOpenChange} />
      </Suspense>
    </Dialog>
  );
}

function ExportBody({
  domain,
  terms: termsPromise,
  onOpenChange,
}: {
  domain: Domain;
  terms: Promise<CollectionExport>;
  onOpenChange: (open: boolean) => void;
}) {
  const result = use(termsPromise);
  if ("error" in result) {
    return (
      <>
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
        <DialogFooter className="shrink-0">
          <Button type="button" variant="outline" onPress={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }
  return <ExportPanel domain={domain} terms={result.terms} onOpenChange={onOpenChange} />;
}

function ExportPanel({
  domain,
  terms,
  onOpenChange,
}: {
  domain: Domain;
  terms: Term[];
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const json = useMemo(
    () => stringifyImportPayload(buildImportPayloadFromCollection(domain, terms)),
    [domain, terms],
  );

  async function handleCopy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyText() {
    await navigator.clipboard.writeText(collectionToText(terms));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadCsv() {
    download(
      collectionToCsv(terms),
      "text/csv",
      exportFilename(domain.name).replace(/\.json$/, ".csv"),
    );
  }

  function handleDownload() {
    download(json, "application/json", exportFilename(domain.name));
  }

  function download(contents: string, type: string, filename: string) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <ImportCodePanel
        actions={
          <Button type="button" variant="outline" size="sm" onPress={handleCopy} isDisabled={!json}>
            <CopyIconSwap copied={copied} />
            {copied ? "Copied" : "Copy JSON"}
          </Button>
        }
      >
        {json}
      </ImportCodePanel>

      <DialogFooter className="shrink-0">
        <Button type="button" variant="outline" onPress={() => onOpenChange(false)}>
          Close
        </Button>
        <Button
          type="button"
          variant="outline"
          onPress={() => void handleCopyText()}
          isDisabled={!json}
        >
          Copy as text
        </Button>
        <Button type="button" variant="outline" onPress={handleDownloadCsv} isDisabled={!json}>
          Download CSV
        </Button>
        <Button type="button" onPress={handleDownload} isDisabled={!json}>
          <Download className="size-4" />
          Download .json
        </Button>
      </DialogFooter>
    </>
  );
}
