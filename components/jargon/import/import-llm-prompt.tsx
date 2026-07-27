"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CopyIconSwap } from "@/components/jargon/settings/ui";
import { ImportCard, ImportCodePanel } from "@/components/jargon/import/import-ui";
import { buildImportLlmPrompt } from "@/lib/jargon/import/llm-prompt";

export function ImportLlmPrompt() {
  const [domain, setDomain] = useState("");
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => buildImportLlmPrompt(domain.trim() || "YOUR DOMAIN"), [domain]);

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ImportCard
      step={1}
      icon={Sparkles}
      title="Generate with an LLM"
      description="Optional — copy a prompt into ChatGPT, Claude, or another LLM, then paste the JSON in step 2."
      collapsible
      defaultExpanded={false}
      expandLabel="Show prompt"
      collapseLabel="Hide prompt"
    >
      <Field>
        <FieldLabel htmlFor="import-llm-domain">Your collection</FieldLabel>
        <Input
          id="import-llm-domain"
          type="text"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="e.g. Product Management, DevOps, Finance"
          className="text-sm"
        />
      </Field>

      <ImportCodePanel
        actions={
          <Button type="button" variant="outline" size="sm" onPress={handleCopy}>
            <CopyIconSwap copied={copied} />
            {copied ? "Copied" : "Copy prompt"}
          </Button>
        }
      >
        {prompt}
      </ImportCodePanel>
    </ImportCard>
  );
}
