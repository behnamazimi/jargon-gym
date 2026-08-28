"use client";

import { Check, Copy, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PLATFORM_MEDIA } from "@/lib/platform";
import { cn } from "@/lib/utils";

export type SettingsTabId = "quiz" | "telegram" | "widget" | "admin" | "read";

export function ScrollToSettingsPanel({ tab }: { tab: SettingsTabId }) {
  useEffect(() => {
    const el = document.getElementById(`settings-panel-${tab}`);
    if (!el) return;

    const behavior = window.matchMedia(PLATFORM_MEDIA.reducedMotion).matches ? "instant" : "smooth";
    el.scrollIntoView({ block: "start", behavior });
  }, [tab]);

  return null;
}

export function SettingsPanel({
  id,
  icon: Icon,
  title,
  description,
  status,
  children,
}: {
  id: SettingsTabId;
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  status?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `settings-heading-${id}`;

  return (
    <section
      id={`settings-panel-${id}`}
      aria-labelledby={headingId}
      className="scroll-mt-4 max-md:scroll-mt-[calc(3.5rem+env(safe-area-inset-top,0px))]"
    >
      <Card className="shadow-surface overflow-hidden rounded-2xl ring-1 ring-base-content/5">
        <div
          className={cn(
            "flex gap-3 border-b border-base-300/60 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5",
            description ? "items-start" : "items-center",
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={headingId} className="m-0 text-base font-semibold">
                {title}
              </h2>
              {status}
            </div>
            {description ? (
              <p className="m-0 text-sm leading-relaxed text-base-content/60">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">{children}</div>
      </Card>
    </section>
  );
}

export function SettingsStack({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-base-300/70">{children}</div>;
}

export function SettingsRow({
  title,
  description,
  children,
  layout = "stacked",
  htmlFor,
  titleId,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  layout?: "stacked" | "inline";
  htmlFor?: string;
  titleId?: string;
}) {
  const heading = htmlFor ? (
    <Label htmlFor={htmlFor} className="m-0 text-sm font-semibold">
      {title}
    </Label>
  ) : (
    <h3 id={titleId} className="m-0 text-sm font-semibold">
      {title}
    </h3>
  );

  const copy = (
    <div className="min-w-0 space-y-1">
      {heading}
      {description ? (
        <div className="text-sm leading-relaxed text-base-content/60">{description}</div>
      ) : null}
    </div>
  );

  if (layout === "inline") {
    return (
      <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
        {copy}
        <div className="flex min-h-11 shrink-0 items-center">{children}</div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      {copy}
      <div className="min-w-0 space-y-3 md:max-w-md">{children}</div>
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
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
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
    <li className="relative flex gap-4 pb-6 last:pb-0">
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
