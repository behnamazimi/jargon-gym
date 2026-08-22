"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function ImportCard({
  step,
  icon: Icon,
  title,
  description,
  children,
  className,
  collapsible = false,
  defaultExpanded = true,
  expandLabel = "Show",
  collapseLabel = "Hide",
}: {
  step: number;
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const header = (
    <>
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold tabular-nums text-secondary-content"
        aria-hidden
      >
        {step}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5 text-left">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden strokeWidth={1.5} />
          </div>
          <h2 className="m-0 text-base font-semibold">{title}</h2>
        </div>
        {description ? (
          <p className="m-0 text-sm leading-relaxed text-base-content/60">{description}</p>
        ) : null}
      </div>
      {collapsible ? (
        <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-sm text-base-content/60">
          {expanded ? collapseLabel : expandLabel}
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200 ease-out",
              expanded && "rotate-180",
            )}
            aria-hidden
            strokeWidth={1.5}
          />
        </span>
      ) : null}
    </>
  );

  const body = <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">{children}</div>;

  if (!collapsible) {
    return (
      <Card
        className={cn("shadow-surface overflow-hidden rounded-2xl ring-base-content/5", className)}
      >
        <div className="flex items-start gap-3 border-b border-base-300/60 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          {header}
        </div>
        {body}
      </Card>
    );
  }

  return (
    <Collapsible isExpanded={expanded} onExpandedChange={setExpanded}>
      <Card
        className={cn("shadow-surface overflow-hidden rounded-2xl ring-base-content/5", className)}
      >
        <CollapsibleTrigger className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-base-200/40 sm:gap-4 sm:px-6 sm:py-5">
          {header}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-base-300/60">{body}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function ImportStat({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: ReactNode;
  variant?: "default" | "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-4 py-3",
        variant === "primary"
          ? "bg-primary/8 ring-1 ring-primary/20"
          : "bg-base-200/50 ring-1 ring-base-content/5",
      )}
    >
      <dt className="text-xs text-base-content/60">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function ImportCategoryBadges({ categories }: { categories: string[] }) {
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((category) => (
        <Badge key={category} variant="outline" className="text-xs font-normal">
          {category}
        </Badge>
      ))}
    </div>
  );
}

export function ImportCodePanel({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="relative">
      <div className="shadow-surface max-h-[320px] overflow-auto rounded-xl bg-base-200/30 p-1">
        <pre className="m-0 rounded-lg bg-base-100 p-3 text-xs leading-5 whitespace-pre-wrap text-base-content ring-1 ring-base-content/[0.06] dark:ring-base-100/[0.06]">
          {children}
        </pre>
      </div>
      {actions ? <div className="absolute top-3 right-3">{actions}</div> : null}
    </div>
  );
}

export function ImportToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function ImportToolbarLabel({ children }: { children: ReactNode }) {
  return (
    <span className="w-full text-xs font-medium text-base-content/60 sm:w-auto sm:pr-1">
      {children}
    </span>
  );
}
