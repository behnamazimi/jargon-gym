import type { OverallStrength } from "@/lib/smart-queue/strength";
import { cn } from "@/lib/utils";

const STRENGTH_LABEL: Record<OverallStrength, string> = {
  unverified: "Not yet tested",
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

const STRENGTH_BADGE_CLASS: Record<OverallStrength, string> = {
  unverified: "badge-soft badge-neutral",
  weak: "badge-soft badge-error",
  medium: "badge-soft badge-warning",
  strong: "badge-soft badge-success",
};

type StrengthBadgeProps = {
  strength: OverallStrength | undefined;
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
