"use client";

import { Check, Copy, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function SettingsCard({
  icon: Icon,
  title,
  description,
  status,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  status?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden ring-base-content/5", className)}>
      <div className="flex items-start gap-4 border-b border-base-300/60 px-5 py-5 sm:px-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-base font-semibold">{title}</h2>
            {status}
          </div>
          {description ? (
            <p className="m-0 text-sm leading-relaxed text-base-content/60">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-6 px-5 py-5 sm:px-6">{children}</div>
    </Card>
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
          {title ? <h3 className="m-0 text-sm font-semibold">{title}</h3> : null}
          {description ? (
            <div className="mt-1 text-sm leading-relaxed text-base-content/60">{description}</div>
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

const STATUS_BADGE_VARIANT: Record<StatusVariant, "default" | "secondary" | "outline"> = {
  connected: "default",
  pending: "secondary",
  disconnected: "outline",
};

const STATUS_DOT_CLASS: Record<StatusVariant, string> = {
  connected: "bg-primary",
  pending: "bg-warning",
  disconnected: "bg-base-content/30",
};

export function StatusPill({ variant }: { variant: StatusVariant }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[variant]} className="gap-1.5 text-xs">
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
          "absolute inset-0 size-3.5 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
          copied ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0",
        )}
      />
      <Check
        className={cn(
          "absolute inset-0 size-3.5 text-primary transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
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
    <div className="rounded-xl bg-primary/8 px-4 py-4 shadow-[0_1px_2px_oklch(0_0_0/0.05),0_4px_16px_oklch(0_0_0/0.04)] ring-1 ring-primary/20">
      <p className="m-0 text-xs font-medium uppercase tracking-wide text-primary">{label}</p>
      <div className="mt-3 space-y-3">{children}</div>
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
        className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-secondary-content"
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

export function TokenRow({
  label,
  meta,
  action,
}: {
  label: string;
  meta: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-base-200/50 px-3 py-3">
      <div className="min-w-0">
        <p className="m-0 truncate text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-base-content/60">{meta}</p>
      </div>
      {action}
    </div>
  );
}
