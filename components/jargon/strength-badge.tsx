import type { Strength } from "@/lib/smart-queue";
import { cn } from "@/lib/utils";

const STRENGTH_LABEL: Record<Strength, string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

const STRENGTH_BADGE_CLASS: Record<Strength, string> = {
  weak: "badge-soft badge-error",
  medium: "badge-soft badge-warning",
  strong: "badge-soft badge-success",
};

type StrengthBadgeProps = {
  strength: Strength | undefined;
  className?: string;
};

/** Display-only mastery tier badge. Never feeds back into scoring. */
export function StrengthBadge({ strength, className }: StrengthBadgeProps) {
  if (!strength) return null;

  return (
    <span
      className={cn("badge badge-sm font-normal", STRENGTH_BADGE_CLASS[strength], className)}
      aria-label={`Strength: ${STRENGTH_LABEL[strength]}`}
    >
      {STRENGTH_LABEL[strength]}
    </span>
  );
}
