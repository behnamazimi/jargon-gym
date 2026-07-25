"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function SettingsPanel({ children }: { children: ReactNode }) {
  return (
    <Card className="rounded-card border-border bg-surface p-5 shadow-sm sm:p-6">{children}</Card>
  );
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="m-0 text-[15px] font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-[13px] text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsGroup({
  title,
  description,
  children,
}: {
  title?: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {title || description ? (
        <div>
          {title ? (
            <h3 className="m-0 text-[14px] font-semibold text-foreground">{title}</h3>
          ) : null}
          {description ? (
            <div className="mt-1 text-[13px] leading-relaxed text-muted">{description}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function SettingsDivider() {
  return <Separator />;
}

type StatusVariant = "connected" | "pending" | "disconnected";

const STATUS_LABELS: Record<StatusVariant, string> = {
  connected: "Connected",
  pending: "Link pending",
  disconnected: "Not connected",
};

const STATUS_BADGE_CLASS: Record<StatusVariant, string> = {
  connected: "bg-success-subtle text-success hover:bg-success-subtle",
  pending: "bg-accent-subtle text-accent hover:bg-accent-subtle",
  disconnected: "bg-chip text-muted hover:bg-chip",
};

export function StatusPill({ variant }: { variant: StatusVariant }) {
  return (
    <Badge variant="secondary" className={cn("text-[12px]", STATUS_BADGE_CLASS[variant])}>
      {STATUS_LABELS[variant]}
    </Badge>
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
      {label ? <p className="m-0 text-[12px] font-medium text-foreground">{label}</p> : null}
      {hint ? <p className="m-0 text-[12px] text-muted">{hint}</p> : null}
      <div className="flex items-start gap-2">
        <Input
          readOnly
          value={value}
          className={cn(
            "min-w-0 flex-1 text-[12px] leading-5",
            monospace ? "font-mono" : "whitespace-pre-wrap",
          )}
        />
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
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
    <div className="rounded-lg border border-accent/30 bg-accent-subtle px-3 py-3">
      <p className="m-0 text-[12px] font-medium uppercase tracking-wide text-accent">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function SetupStep({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chip text-[12px] font-semibold text-foreground"
        aria-hidden
      >
        {step}
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h3 className="m-0 text-[14px] font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </li>
  );
}
