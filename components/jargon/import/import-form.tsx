"use client";

import { Braces, Ellipsis, FileUp } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { ImportCard, ImportToolbar } from "@/components/jargon/import/import-ui";
import { formatImportJson, readJsonFile } from "@/lib/jargon/import/json-helpers";
import {
  IMPORT_MINIMAL_PAYLOAD,
  IMPORT_SAMPLE_PAYLOAD,
  stringifyImportPayload,
} from "@/lib/jargon/import/sample-payload";
import type { ImportFailure } from "@/lib/jargon/import/types";

type ImportFormProps = {
  value: string;
  onChange: (value: string) => void;
  onValidate: () => void;
  isValidating: boolean;
  onFailure?: (failure: ImportFailure | null) => void;
};

export function ImportForm({
  value,
  onChange,
  onValidate,
  isValidating,
  onFailure,
}: ImportFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lineCount = value.trim() ? value.split("\n").length : 0;
  const hasContent = value.trim().length > 0;

  function applyTemplate(template: "sample" | "minimal") {
    const payload = template === "sample" ? IMPORT_SAMPLE_PAYLOAD : IMPORT_MINIMAL_PAYLOAD;
    onChange(`${stringifyImportPayload(payload)}\n`);
    onFailure?.(null);
  }

  function handleFormat() {
    const result = formatImportJson(value);
    if (!result.ok) {
      onFailure?.(result.failure);
      return;
    }

    onChange(result.formatted);
    onFailure?.(null);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const result = await readJsonFile(file);
    if (!result.ok) {
      onFailure?.(result.failure);
      return;
    }

    onChange(result.contents);
    onFailure?.(null);
  }

  function handleClear() {
    onChange("");
    onFailure?.(null);
  }

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="application/json,.json"
      className="hidden"
      onChange={handleFileChange}
    />
  );

  return (
    <ImportCard
      icon={Braces}
      title="Paste or upload JSON"
      description="Add terms to a collection you own, or create a new one from the file."
    >
      <div className="flex items-center gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 flex-1"
          onPress={() => fileInputRef.current?.click()}
        >
          <FileUp className="size-3.5" aria-hidden strokeWidth={1.5} />
          Upload .json
        </Button>
        <DropdownMenuTrigger>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="btn-square min-h-11 min-w-11"
            aria-label="More import tools"
          >
            <Ellipsis className="size-4" aria-hidden strokeWidth={1.5} />
          </Button>
          <DropdownMenu className="min-w-[160px]">
            <DropdownMenuItem onAction={() => applyTemplate("sample")}>
              Load example
            </DropdownMenuItem>
            <DropdownMenuItem onAction={() => applyTemplate("minimal")}>
              Load minimal
            </DropdownMenuItem>
            <DropdownMenuItem isDisabled={!hasContent} onAction={handleFormat}>
              Format JSON
            </DropdownMenuItem>
            <DropdownMenuItem isDisabled={!hasContent} onAction={handleClear}>
              Clear
            </DropdownMenuItem>
          </DropdownMenu>
        </DropdownMenuTrigger>
      </div>

      <div className="hidden items-center justify-between gap-2 md:flex">
        <ImportToolbar>
          <Button type="button" variant="outline" size="sm" onPress={() => applyTemplate("sample")}>
            Load example
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onPress={() => applyTemplate("minimal")}
          >
            Load minimal
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onPress={handleFormat}
            isDisabled={!hasContent}
          >
            Format JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onPress={() => fileInputRef.current?.click()}
          >
            <FileUp className="size-3.5" aria-hidden strokeWidth={1.5} />
            Upload .json
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onPress={handleClear}
            isDisabled={!hasContent}
          >
            Clear
          </Button>
        </ImportToolbar>
        <span className="shrink-0 text-xs tabular-nums text-base-content/60">
          {hasContent ? `${lineCount} lines` : "No content yet"}
        </span>
      </div>

      <div className="space-y-1.5">
        <p className="m-0 text-end text-xs tabular-nums text-base-content/60 md:hidden">
          {hasContent ? `${lineCount} lines` : "No content yet"}
        </p>
        <Textarea
          id="import-json"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            onFailure?.(null);
          }}
          placeholder={`{\n  "domain": "Software Engineering",\n  "terms": [\n    {\n      "term": "Coupling",\n      "category": "Architecture",\n      "definition": "..."\n    }\n  ],\n  "relationships": [\n    {\n      "source": "Coupling",\n      "target": "Cohesion",\n      "relationship_type": "often confused with"\n    }\n  ]\n}`}
          spellCheck={false}
          className="min-h-48 resize-y font-mono text-sm leading-5 sm:min-h-80"
        />
      </div>

      <Button
        type="button"
        onPress={onValidate}
        isDisabled={isValidating || !hasContent}
        className="min-h-11 w-full md:w-auto"
      >
        {isValidating ? "Validating…" : "Validate & preview"}
      </Button>
      {fileInput}
    </ImportCard>
  );
}
