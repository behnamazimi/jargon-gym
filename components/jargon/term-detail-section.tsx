import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TermDetailVariant = "callout" | "anti" | "debated";

const LABEL_CLASS: Record<TermDetailVariant, string> = {
  callout: "text-base-content",
  anti: "text-error",
  debated: "text-info",
};

export function TermDetailSection({
  emoji,
  label,
  children,
  variant = "callout",
}: {
  emoji: string;
  label: string;
  children: ReactNode;
  variant?: TermDetailVariant;
}) {
  return (
    <p className="m-0 max-w-prose text-base leading-relaxed text-base-content/85">
      <span className={cn("font-semibold", LABEL_CLASS[variant])}>
        <span aria-hidden>{emoji}</span> {label}:{" "}
      </span>
      {children}
    </p>
  );
}
