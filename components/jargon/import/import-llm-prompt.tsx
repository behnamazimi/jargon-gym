"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { ImportCard } from "@/components/jargon/import/import-ui";
import { CopyCommand } from "@/components/jargon/import/import-copy-command";
import { ImportLlmPromptFields } from "@/components/jargon/import/import-llm-prompt-fields";
import {
  buildRunCommand,
  INSTALL_COMMAND,
  NEW_COLLECTION_KEY,
} from "@/components/jargon/import/import-llm-prompt-helpers";
import type { OwnedCollectionForImport } from "@/lib/jargon/import/owned-collections";

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
          <ImportLlmPromptFields
            collections={collections}
            selectedCollectionId={selectedCollectionId}
            onCollectionChange={handleCollectionChange}
            domain={domain}
            onDomainChange={setDomain}
            count={count}
            onCountChange={setCount}
            exclude={exclude}
            onExcludeChange={setExclude}
          />
        </CopyCommand>
      </div>
    </ImportCard>
  );
}
