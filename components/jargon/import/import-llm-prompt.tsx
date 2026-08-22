"use client";

import { Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CopyIconSwap } from "@/components/jargon/settings/ui";
import { ImportCard } from "@/components/jargon/import/import-ui";
import type { OwnedCollectionForImport } from "@/lib/jargon/import/owned-collections";

const INSTALL_COMMAND =
  "npx skills add https://github.com/behnamazimi/skills --skill jargon-gym-generator";

const NEW_COLLECTION_KEY = "new";
const DEFAULT_COUNT = 100;
const MIN_COUNT = 1;
const MAX_COUNT = 100;

function buildRunCommand(domain: string, countRaw: string, excludeRaw: string) {
  const domainPart = domain.trim() || "[domain]";

  const trimmedCount = countRaw.trim();
  const parsedCount = Number.parseInt(trimmedCount, 10);
  const count =
    trimmedCount === ""
      ? DEFAULT_COUNT
      : Number.isFinite(parsedCount) && parsedCount >= MIN_COUNT && parsedCount <= MAX_COUNT
        ? parsedCount
        : DEFAULT_COUNT;

  const excludeTerms = excludeRaw
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);

  const parts = [domainPart, String(count)];
  if (excludeTerms.length > 0) {
    parts.push(`exclude: ${excludeTerms.join(", ")}`);
  }

  return `/jargon-gym-generator ${parts.join(" | ")}`;
}

function CopyCommand({
  label,
  hint,
  value,
  prefix,
  children,
}: {
  label: string;
  hint?: string;
  value: string;
  prefix?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="m-0 text-sm font-medium">{label}</p>
        {hint ? <p className="m-0 text-xs leading-relaxed text-base-content/60">{hint}</p> : null}
      </div>

      {children}

      <div className="flex flex-col gap-2 md:flex-row md:items-start">
        <pre className="m-0 min-w-0 flex-1 overflow-x-auto rounded-lg bg-base-200/40 px-3 py-2.5 font-mono text-xs leading-5 whitespace-pre-wrap text-base-content">
          {prefix ? (
            <span className="select-none text-base-content/40" aria-hidden>
              {prefix}{" "}
            </span>
          ) : null}
          {value}
        </pre>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onPress={handleCopy}
          className="min-h-11 w-full shrink-0 transition-transform duration-150 ease-out active:scale-[0.96] md:w-auto"
        >
          <CopyIconSwap copied={copied} />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function ImportLlmPrompt({ collections }: { collections: OwnedCollectionForImport[] }) {
  const [selectedCollectionId, setSelectedCollectionId] = useState(NEW_COLLECTION_KEY);
  const [domain, setDomain] = useState("");
  const [count, setCount] = useState("");
  const [exclude, setExclude] = useState("");

  const runCommand = buildRunCommand(domain, count, exclude);

  function handleCollectionChange(key: string) {
    setSelectedCollectionId(key);

    if (key === NEW_COLLECTION_KEY) {
      setDomain("");
      setExclude("");
      return;
    }

    const collection = collections.find((item) => item.id === key);
    if (!collection) return;

    setDomain(collection.name);
    setExclude(collection.terms.join(", "));
  }

  return (
    <ImportCard
      icon={Sparkles}
      title="Generate with an AI skill"
      description="Optional — install the glossary skill once, generate JSON for your domain, then paste it below."
      collapsible
      defaultExpanded={false}
    >
      <div className="space-y-5">
        <CopyCommand
          label="1. Install the skill"
          hint="Run once in your terminal to add it to your skills collection."
          value={INSTALL_COMMAND}
          prefix="$"
        />

        <CopyCommand
          label="2. Build your generate command"
          hint="Fill in the fields, copy the command, and run it in Cursor or Claude. Pick an existing collection to autofill its name and terms to exclude."
          value={runCommand}
        >
          <div className="space-y-3">
            {collections.length > 0 ? (
              <Field>
                <FieldLabel htmlFor="import-skill-collection">Add to collection</FieldLabel>
                <Select
                  selectedKey={selectedCollectionId}
                  onSelectionChange={(key) => handleCollectionChange(String(key))}
                  className="w-full"
                >
                  <SelectTrigger id="import-skill-collection" className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem id={NEW_COLLECTION_KEY}>New collection</SelectItem>
                    {collections.map((collection) => (
                      <SelectItem key={collection.id} id={collection.id}>
                        {collection.name}
                        {collection.terms.length > 0 ? ` (${collection.terms.length})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem]">
              <Field>
                <FieldLabel htmlFor="import-skill-domain">Collection name</FieldLabel>
                <Input
                  id="import-skill-domain"
                  type="text"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="e.g. Product Management"
                  className="text-sm"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="import-skill-count">Count</FieldLabel>
                <Input
                  id="import-skill-count"
                  type="text"
                  inputMode="numeric"
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  placeholder={String(DEFAULT_COUNT)}
                  className="text-sm tabular-nums"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="import-skill-exclude">Exclude terms</FieldLabel>
              <Textarea
                id="import-skill-exclude"
                value={exclude}
                onChange={(event) => setExclude(event.target.value)}
                placeholder="e.g. Agile, Scrum, OKR"
                rows={2}
                className="min-h-11 text-sm"
              />
            </Field>
          </div>
        </CopyCommand>
      </div>
    </ImportCard>
  );
}
