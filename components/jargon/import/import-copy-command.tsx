import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CopyIconSwap } from "@/components/jargon/settings/ui";

export function CopyCommand({
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
