"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { JargonErrorAlert } from "@/components/jargon/shared/error-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatusVariant = "connected" | "pending" | "disconnected";

const STATUS_LABELS: Record<StatusVariant, string> = {
  connected: "Connected",
  pending: "Link pending",
  disconnected: "Not connected",
};

const STATUS_DOT_CLASS: Record<StatusVariant, string> = {
  connected: "bg-success",
  pending: "bg-warning",
  disconnected: "bg-base-content/30",
};

export function StatusPill({ variant }: { variant: StatusVariant }) {
  return (
    <Badge variant="outline" className="gap-1.5 text-xs font-medium">
      <span
        className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[variant])}
        aria-hidden
      />
      {STATUS_LABELS[variant]}
    </Badge>
  );
}

export function CopyIconSwap({ copied }: { copied: boolean }) {
  return (
    <span className="relative inline-flex size-3.5 shrink-0" aria-hidden>
      <Copy
        className={cn(
          "absolute inset-0 size-3.5 transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          copied ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0",
        )}
      />
      <Check
        className={cn(
          "absolute inset-0 size-3.5 text-success transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          copied ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]",
        )}
      />
    </span>
  );
}

export function CopyField({
  label,
  value,
  hint,
  monospace = true,
}: {
  label?: string;
  value: string;
  hint?: string;
  monospace?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      {label || hint ? (
        <div className="space-y-0.5">
          {label ? <p className="m-0 text-sm font-medium">{label}</p> : null}
          {hint ? <p className="m-0 text-xs leading-relaxed text-base-content/60">{hint}</p> : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-2 md:flex-row md:items-start">
        <pre
          className={cn(
            "m-0 min-w-0 flex-1 overflow-x-auto rounded-lg bg-base-200/40 px-3 py-2.5 text-xs leading-5 break-all whitespace-pre-wrap text-base-content",
            monospace && "font-mono",
          )}
        >
          {value}
        </pre>
        <Button
          type="button"
          variant="outline"
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

export function AlertBanner({ message }: { message: string }) {
  return <JargonErrorAlert error={message} />;
}

export function HighlightPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-base-300/80 bg-base-200/40 px-3 py-3">
      <p className="m-0 text-sm font-medium">{label}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function TokenRow({
  label,
  meta,
  badge,
  action,
}: {
  label: string;
  meta: string;
  badge?: ReactNode;
  action: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="m-0 text-sm font-medium">{label}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-base-content/60">
          <span>{meta}</span>
          {badge}
        </p>
      </div>
      <div className="w-full shrink-0 md:w-auto">{action}</div>
    </li>
  );
}
