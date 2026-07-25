"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { buildImportLlmPrompt } from "@/lib/jargon/import/llm-prompt";

export function ImportLlmPrompt() {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => buildImportLlmPrompt(domain.trim() || "YOUR DOMAIN"), [domain]);

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Collapsible
      isExpanded={open}
      onExpandedChange={setOpen}
      className="rounded-lg bg-card text-card-foreground ring-1 ring-foreground/10"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
        <span>LLM prompt</span>
        <span className="text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-3 border-t border-border px-4 py-4">
          <p className="m-0 text-sm leading-relaxed text-muted-foreground">
            Copy this prompt into ChatGPT, Claude, or another LLM. Paste the JSON it returns into
            the box below.
          </p>

          <Field>
            <FieldLabel htmlFor="import-llm-domain">Your domain</FieldLabel>
            <Input
              id="import-llm-domain"
              type="text"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="e.g. Product Management, DevOps, Finance"
              className="text-sm"
            />
          </Field>

          <div className="relative">
            <pre className="max-h-[320px] overflow-auto rounded-lg border border-border bg-background p-3 text-xs leading-5 whitespace-pre-wrap text-foreground">
              {prompt}
            </pre>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onPress={handleCopy}
              className="absolute top-2 right-2 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-primary" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy prompt
                </>
              )}
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
