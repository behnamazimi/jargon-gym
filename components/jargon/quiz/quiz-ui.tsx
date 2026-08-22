import { type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function QuizPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "shadow-surface overflow-hidden rounded-2xl bg-base-100 ring-1 ring-base-content/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function QuizPanelHeader({
  icon: Icon,
  title,
  description,
  aside,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-base-300/60 px-5 py-5 sm:px-6">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-base font-semibold">{title}</h2>
          {aside}
        </div>
        {description ? (
          <p className="m-0 text-sm leading-relaxed text-base-content/60">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function QuizPanelLabel({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5 space-y-1">
      <p className="m-0 text-sm font-semibold text-base-content/80">{title}</p>
      {description ? (
        <p className="m-0 text-xs leading-relaxed text-base-content/50">{description}</p>
      ) : null}
    </div>
  );
}

export function QuizPanelBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-6 px-5 py-5 sm:px-6", className)}>{children}</div>;
}

export function QuizSetupFooter({
  hint,
  children,
  className,
}: {
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 border-t border-base-300/60 pt-6", className)}>
      {hint ? <p className="m-0 text-xs leading-relaxed text-base-content/60">{hint}</p> : null}
      <div className="w-full">{children}</div>
    </div>
  );
}

export function QuizStat({
  label,
  value,
  variant = "default",
}: {
  label?: string;
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
      {label ? <dt className="text-xs text-base-content/60">{label}</dt> : null}
      <dd className={cn("text-sm font-semibold tabular-nums", label && "mt-0.5")}>{value}</dd>
    </div>
  );
}

export function QuizActionBar({ hint, children }: { hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-base-300/60 pt-5 md:flex-row md:items-center md:justify-between">
      {hint ? (
        <p className="m-0 text-xs text-base-content/60 max-md:order-last">{hint}</p>
      ) : (
        <span className="max-md:hidden" />
      )}
      <div className="flex flex-wrap justify-end gap-2 max-md:flex-col max-md:[&_.btn]:min-h-11 max-md:[&_.btn]:w-full">
        {children}
      </div>
    </div>
  );
}

export function QuizKeyboardHint({ action }: { action: string }) {
  return (
    <span className="hidden md:inline coarse:hidden">
      Press <kbd className="kbd kbd-xs">Enter</kbd> to {action}
    </span>
  );
}

export function QuizCenteredState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-2 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <h2 className="m-0 text-sm font-semibold text-base-content/80">{title}</h2>
        {description ? (
          <p className="m-0 text-sm leading-relaxed text-base-content/60">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function QuizTermList({
  title,
  terms,
  emptyMessage,
}: {
  title: string;
  terms: { id: string; term: string }[];
  emptyMessage: string;
}) {
  if (terms.length === 0) {
    return <p className="m-0 text-sm text-base-content/60">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="m-0 text-sm font-semibold">{title}</p>
      <ul className="m-0 space-y-1.5">
        {terms.map((term) => (
          <li
            key={term.id}
            className="shadow-surface rounded-xl bg-base-200/40 px-3.5 py-2.5 text-sm text-base-content/80"
          >
            {term.term}
          </li>
        ))}
      </ul>
    </div>
  );
}
