"use client";

import { Braces } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImportCard } from "@/components/jargon/import/import-ui";
import {
  ImportFormDesktopToolbar,
  ImportFormMobileToolbar,
} from "@/components/jargon/import/import-form-toolbars";
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

  const toolbarProps = {
    hasContent,
    onApplyTemplate: applyTemplate,
    onFormat: handleFormat,
    onClear: handleClear,
    onUploadClick: () => fileInputRef.current?.click(),
  };

  return (
    <ImportCard
      icon={Braces}
      title="Paste or upload JSON"
      description="Add terms to a collection you own, or create a new one from the file."
    >
      <ImportFormMobileToolbar {...toolbarProps} />
      <ImportFormDesktopToolbar {...toolbarProps} lineCount={lineCount} />

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
