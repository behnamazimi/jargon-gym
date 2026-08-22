"use client";

import { Braces, FileUp } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ImportCard,
  ImportToolbar,
  ImportToolbarLabel,
} from "@/components/jargon/import/import-ui";
import { formatImportJson, readJsonFile } from "@/lib/jargon/import/json-helpers";
import {
  IMPORT_MINIMAL_PAYLOAD,
  IMPORT_SAMPLE_PAYLOAD,
  stringifyImportPayload,
} from "@/lib/jargon/import/sample-payload";
import type { ImportFailure } from "@/lib/jargon/import/types";
import { cn } from "@/lib/utils";

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

  return (
    <ImportCard
      step={2}
      icon={Braces}
      title="Paste or upload JSON"
      description="Add terms to a collection you own, or create a new one from the file."
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ImportToolbarLabel>Templates &amp; tools</ImportToolbarLabel>
        <span className="text-xs tabular-nums text-base-content/60">
          {hasContent ? `${lineCount} lines` : "No content yet"}
        </span>
      </div>

      <ImportToolbar>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-md:min-h-11"
          onPress={() => applyTemplate("sample")}
        >
          Load example
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-md:min-h-11"
          onPress={() => applyTemplate("minimal")}
        >
          Load minimal
        </Button>
        <Separator orientation="vertical" className="hidden h-6 md:block" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-md:min-h-11"
          onPress={handleFormat}
          isDisabled={!hasContent}
        >
          Format JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-md:min-h-11"
          onPress={() => fileInputRef.current?.click()}
        >
          <FileUp className="size-3.5" aria-hidden strokeWidth={1.5} />
          Upload .json
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-md:min-h-11"
          onPress={handleClear}
          isDisabled={!hasContent}
        >
          Clear
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileChange}
        />
      </ImportToolbar>

      <div className="shadow-surface rounded-xl p-1">
        <Textarea
          id="import-json"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            onFailure?.(null);
          }}
          placeholder={`{\n  "domain": "Software Engineering",\n  "terms": [\n    {\n      "term": "Coupling",\n      "category": "Architecture",\n      "definition": "..."\n    }\n  ],\n  "relationships": [\n    {\n      "source": "Coupling",\n      "target": "Cohesion",\n      "relationship_type": "often confused with"\n    }\n  ]\n}`}
          spellCheck={false}
          className={cn(
            "min-h-[220px] resize-y border-0 bg-base-100 font-mono text-sm leading-5 shadow-none ring-1 ring-base-content/[0.06] focus-visible:ring-2 sm:min-h-[320px] dark:ring-base-100/[0.06]",
            "rounded-lg",
          )}
        />
      </div>

      <Button
        type="button"
        onPress={onValidate}
        isDisabled={isValidating || !hasContent}
        className="w-full md:w-auto"
      >
        {isValidating ? "Validating…" : "Validate & preview"}
      </Button>
    </ImportCard>
  );
}
