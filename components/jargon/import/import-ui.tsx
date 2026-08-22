"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function ImportCard({
  icon: Icon,
  title,
  description,
  children,
  className,
  collapsible = false,
  defaultExpanded = true,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const headerDescription = !collapsible && description ? description : undefined;

  const header = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1 space-y-1 text-left">
        <h2 className="m-0 text-base font-semibold">{title}</h2>
        {headerDescription ? (
          <p className="m-0 text-sm leading-relaxed text-base-content/60">{headerDescription}</p>
        ) : null}
      </div>
      {collapsible ? (
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-base-content/60 transition-transform duration-200 ease-out motion-reduce:transition-none",
            expanded && "rotate-180",
          )}
          aria-hidden
          strokeWidth={1.5}
        />
      ) : null}
    </>
  );

  const headerClassName = cn(
    "flex gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5",
    headerDescription ? "items-start" : "items-center",
  );

  const body = (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
      {collapsible && description ? (
        <p className="m-0 text-sm leading-relaxed text-base-content/60">{description}</p>
      ) : null}
      {children}
    </div>
  );

  if (!collapsible) {
    return (
      <Card
        className={cn(
          "shadow-surface overflow-hidden rounded-2xl ring-1 ring-base-content/5",
          className,
        )}
      >
        <div className={cn(headerClassName, "border-b border-base-300/60")}>{header}</div>
        {body}
      </Card>
    );
  }

  return (
    <Collapsible isExpanded={expanded} onExpandedChange={setExpanded}>
      <Card
        className={cn(
          "shadow-surface overflow-hidden rounded-2xl ring-1 ring-base-content/5",
          className,
        )}
      >
        <CollapsibleTrigger
          className={cn(
            headerClassName,
            "w-full text-left transition-colors hover:bg-base-200/40 motion-reduce:transition-none",
          )}
          aria-expanded={expanded}
        >
          {header}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-base-300/60">{body}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
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
