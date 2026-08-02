"use client";

import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import type { Domain, Term } from "@/lib/jargon/types";

type DomainExportDialogProps = {
  domain: Domain;
  terms: Term[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DomainExportDialog({
  domain,
  terms,
  isOpen,
  onOpenChange,
}: DomainExportDialogProps) {
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => {
    if (!isOpen) return "";
    const payload = buildImportPayloadFromCollection(domain, terms);
    return stringifyImportPayload(payload);
  }, [isOpen, domain, terms]);

  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  async function handleCopy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportFilename(domain.name);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Export collection</DialogTitle>
        <DialogDescription>
          Export &ldquo;{domain.name}&rdquo; as JSON. Copy it or download a file you can re-import
          later.
        </DialogDescription>
      </DialogHeader>

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
        <Button type="button" onPress={handleDownload} isDisabled={!json}>
          <Download className="size-4" />
          Download .json
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
