import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function TermDetailSection({
  label,
  children,
  variant = "default",
}: {
  label: string;
  children: ReactNode;
  variant?: "default" | "callout" | "debated";
}) {
  if (variant === "debated") {
    return (
      <div className="flex gap-2.5 rounded-lg bg-primary/5 p-3 ring-1 ring-primary/20">
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden
          strokeWidth={1.5}
        />
        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">{label}</p>
          <div className="mt-1 text-sm leading-relaxed text-base-content/60">{children}</div>
        </div>
      </div>
    );
  }

  if (variant === "callout") {
    return (
      <div className="rounded-lg bg-base-200/50 p-3">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{label}</p>
        <div className="mt-1 text-sm leading-relaxed text-base-content/60">{children}</div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">{label}</p>
      <div className="mt-1 text-sm leading-relaxed text-base-content/60">{children}</div>
    </div>
  );
}
