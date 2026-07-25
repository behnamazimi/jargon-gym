"use client";

import { useRef } from "react";
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
        <span className="text-[12px] text-muted">
          {value.trim() ? `${lineCount} lines` : "No content yet"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyTemplate("sample")}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium shadow-sm"
        >
          Load example
        </button>
        <button
          type="button"
          onClick={() => applyTemplate("minimal")}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium shadow-sm"
        >
          Load minimal
        </button>
        <button
          type="button"
          onClick={handleFormat}
          disabled={!value.trim()}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium shadow-sm disabled:opacity-50"
        >
          Format JSON
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium shadow-sm"
        >
          Upload .json
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={!value.trim()}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium shadow-sm disabled:opacity-50"
        >
          Clear
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <textarea
        id="import-json"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onFailure?.(null);
        }}
        placeholder={`{\n  "domain": "Software Engineering",\n  "terms": [\n    {\n      "term": "Coupling",\n      "category": "Architecture",\n      "definition": "..."\n    }\n  ],\n  "relationships": [\n    {\n      "source": "Coupling",\n      "target": "Cohesion",\n      "relationship_type": "often confused with"\n    }\n  ]\n}`}
        spellCheck={false}
        className="min-h-[320px] w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[13px] leading-5 text-foreground shadow-sm outline-none focus:border-accent"
      />

      <p className="text-[12px] text-muted">
        Required fields per term: <span className="font-mono">term</span>,{" "}
        <span className="font-mono">category</span>, <span className="font-mono">definition</span>.
        Use Load example to see optional fields and relationships.
      </p>

      <button
        type="button"
        onClick={onValidate}
        disabled={isValidating || value.trim().length === 0}
        className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isValidating ? "Validating…" : "Validate & preview"}
      </button>
    </div>
  );
}
