"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-[13px] font-medium text-foreground" htmlFor="import-json">
          JSON payload
        </label>
        <span className="text-[12px] text-muted-foreground">
          {value.trim() ? `${lineCount} lines` : "No content yet"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onPress={() => applyTemplate("sample")}>
          Load example
        </Button>
        <Button type="button" variant="outline" size="sm" onPress={() => applyTemplate("minimal")}>
          Load minimal
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onPress={handleFormat}
          isDisabled={!value.trim()}
        >
          Format JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onPress={() => fileInputRef.current?.click()}
        >
          Upload .json
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onPress={handleClear}
          isDisabled={!value.trim()}
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
      </div>

      <Textarea
        id="import-json"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          onFailure?.(null);
        }}
        placeholder={`{\n  "domain": "Software Engineering",\n  "terms": [\n    {\n      "term": "Coupling",\n      "category": "Architecture",\n      "definition": "..."\n    }\n  ],\n  "relationships": [\n    {\n      "source": "Coupling",\n      "target": "Cohesion",\n      "relationship_type": "often confused with"\n    }\n  ]\n}`}
        spellCheck={false}
        className="min-h-[320px] font-mono text-[13px] leading-5"
      />

      <p className="text-[12px] text-muted-foreground">
        Use the LLM prompt above to generate JSON, or Load example to start from a template.
      </p>

      <Button
        type="button"
        onPress={onValidate}
        isDisabled={isValidating || value.trim().length === 0}
        className="text-[13px]"
      >
        {isValidating ? "Validating…" : "Validate & preview"}
      </Button>
    </div>
  );
}
