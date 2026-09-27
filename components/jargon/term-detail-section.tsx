import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TermDetailVariant = "callout" | "anti" | "debated";

const LABEL_CLASS: Record<TermDetailVariant, string> = {
  callout: "text-base-content",
  anti: "text-error",
  debated: "text-info",
};

export function TermDetailSection({
  icon: Icon,
  label,
  children,
  variant = "callout",
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  variant?: TermDetailVariant;
}) {
  return (
    <p className="m-0 max-w-prose text-base leading-relaxed whitespace-pre-line text-base-content/85">
      <span
        className={cn("inline-flex items-baseline gap-1.5 font-semibold", LABEL_CLASS[variant])}
      >
        <Icon className="size-4 shrink-0 self-center" aria-hidden strokeWidth={2} />
        {label}:
      </span>{" "}
      {children}
    </p>
  );
}
