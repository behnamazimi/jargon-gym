"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SettingsTabId } from "@/components/jargon/settings/settings-tabs";
import { cn } from "@/lib/utils";

export type { SettingsTabId };

export function SettingsPanel({
  id,
  title,
  description,
  status,
  children,
}: {
  id: SettingsTabId;
  title: string;
  description?: ReactNode;
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`settings-panel-${id}`}
      aria-labelledby={`settings-tab-${id}`}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-base-300/70 pb-5">
        <div className="min-w-0 max-w-2xl space-y-1">
          <h2 className="m-0 text-lg font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="m-0 text-sm leading-relaxed text-base-content/60">{description}</p>
          ) : null}
        </div>
        {status}
      </div>
      {children}
    </div>
  );
}

export function SettingsStack({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-base-300/70">{children}</div>;
}

export function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 py-6 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-1">
        <h3 className="m-0 text-sm font-semibold">{title}</h3>
        {description ? (
          <div className="text-sm leading-relaxed text-base-content/60">{description}</div>
        ) : null}
      </div>
      <div className="min-w-0 space-y-3 sm:max-w-md">{children}</div>
    </div>
  );
}

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
    <div className="space-y-1.5">
      {label ? <p className="m-0 text-xs font-medium">{label}</p> : null}
      {hint ? <p className="m-0 text-xs text-base-content/60">{hint}</p> : null}
      <div className="flex items-stretch gap-2">
        <Input
          readOnly
          value={value}
          className={cn(
            "min-w-0 flex-1 rounded-lg text-xs leading-5",
            monospace ? "font-mono" : "whitespace-pre-wrap",
          )}
        />
        <Button type="button" variant="outline" size="sm" onPress={handleCopy} className="shrink-0">
          <CopyIconSwap copied={copied} />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function AlertBanner({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function HighlightPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-base-300/80 bg-base-200/40 px-3 py-3">
      <p className="m-0 text-xs font-medium">{label}</p>
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
    <div className="flex items-center justify-between gap-3 border-b border-base-300/60 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div className="min-w-0">
        <p className="m-0 truncate text-sm font-medium">{label}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-base-content/60">
          <span>{meta}</span>
          {badge}
        </p>
      </div>
      {action}
    </div>
  );
}

export function DangerZone({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-error/20 bg-error/5 px-4 py-4">
      <div>
        <h3 className="m-0 text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-base-content/60">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function SetupStep({
  step,
  title,
  description,
  children,
  isLast = false,
}: {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
  isLast?: boolean;
}) {
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {!isLast ? (
        <span
          className="absolute top-7 left-3 h-[calc(100%-1.25rem)] w-px bg-base-300"
          aria-hidden
        />
      ) : null}
      <span
        className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold tabular-nums text-secondary-content"
        aria-hidden
      >
        {step}
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h3 className="m-0 text-sm font-semibold">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-base-content/60">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </li>
  );
}
