"use client";

import { Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { ImportCard } from "@/components/import/import-ui";
import { CopyCommand } from "@/components/import/import-copy-command";
import { ImportLlmPromptFields } from "@/components/import/import-llm-prompt-fields";
import {
  buildRunCommand,
  INSTALL_COMMAND,
  NEW_COLLECTION_KEY,
} from "@/components/import/import-llm-prompt-helpers";
import { getCollectionTermNames } from "@/app/(private)/app/import/actions";
import type { ImportDestination } from "@/lib/import/import-collections";

export function ImportLlmPrompt({ collections }: { collections: ImportDestination[] }) {
  const [selectedCollectionId, setSelectedCollectionId] = useState(NEW_COLLECTION_KEY);
  const [domain, setDomain] = useState("");
  const [count, setCount] = useState("");
  const [exclude, setExclude] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const latestPick = useRef(0);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);

  const runCommand = buildRunCommand(domain, count, exclude);

  async function handleCollectionChange(key: string) {
    const pick = ++latestPick.current;
    setSelectedCollectionId(key);
    setLoadError(null);
    setIsLoadingTerms(false);

    if (key === NEW_COLLECTION_KEY) {
      setDomain("");
      setExclude("");
      return;
    }

    const collection = collections.find((item) => item.id === key);
    if (!collection) return;

    setDomain(collection.name);
    setExclude("");
    setIsLoadingTerms(true);
    const result = await getCollectionTermNames(key);
    if (pick !== latestPick.current) return;
    setIsLoadingTerms(false);
    if ("error" in result) {
      setLoadError(result.error);
      return;
    }
    setExclude(result.terms.join(", "));
  }

  return (
    <ImportCard
      icon={<Sparkles aria-hidden strokeWidth={1.5} />}
      title="Generate JSON with an AI skill (for developers)"
      description="Install the glossary skill once, generate JSON for your domain, then paste it on the Paste screen."
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
            loadError={loadError}
            isLoadingTerms={isLoadingTerms}
            selectedCollectionId={selectedCollectionId}
            onCollectionChange={(key) => void handleCollectionChange(key)}
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
