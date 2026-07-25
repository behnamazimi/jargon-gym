"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
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
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-medium"
      >
        <span>LLM prompt</span>
        <span className="text-muted">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border px-4 py-4">
          <p className="m-0 text-[13px] leading-relaxed text-muted">
            Copy this prompt into ChatGPT, Claude, or another LLM. Paste the JSON it returns into
            the box below.
          </p>

          <label className="flex flex-col gap-1.5 text-[13px]">
            <span className="font-medium text-foreground">Your domain</span>
            <input
              type="text"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="e.g. Product Management, DevOps, Finance"
              className="rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
          </label>

          <div className="relative">
            <pre className="max-h-[320px] overflow-auto rounded-lg border border-border bg-background p-3 text-[12px] leading-5 text-foreground whitespace-pre-wrap">
              {prompt}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy prompt
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
