import type { OverallStrength } from "@/lib/smart-queue";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const BUCKET_LABEL: Record<OverallStrength, string> = {
  unverified: "Not yet tested",
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

const BUCKET_FILL_CLASS: Record<OverallStrength, string> = {
  unverified: "",
  weak: "bg-error/70",
  medium: "bg-warning/70",
  strong: "bg-success/70",
};

const BAR_HEIGHT_CLASS = ["h-1.5", "h-2", "h-2.5", "h-3", "h-3.5"];

type OverallStrengthBarsProps = {
  bars: number; // 0-5
  bucket: OverallStrength;
  /** 0-100, shown alongside the label on hover. Omit to show the label alone. */
  score?: number;
  className?: string;
};

/** Display-only cross-context mastery indicator — collection cards, stats.
 *  Never feeds back into scoring. `unverified` renders as outlined/gray
 *  bars, distinct from a filled colored bucket, so "never tested" can't be
 *  mistaken for "tested and failing." Hover/focus reveals the label
 *  (and score, when given) as a tooltip. */
export function OverallStrengthBars({ bars, bucket, score, className }: OverallStrengthBarsProps) {
  const isUnverified = bucket === "unverified";
  const label =
    isUnverified || score === undefined
      ? BUCKET_LABEL[bucket]
      : `${BUCKET_LABEL[bucket]} (${score}/100)`;

  return (
    <TooltipTrigger delay={150}>
      <span
        className={cn("inline-flex items-end gap-0.5", className)}
        aria-label={`Overall strength: ${label}`}
      >
        {BAR_HEIGHT_CLASS.map((heightClass, index) => {
          const filled = !isUnverified && index < bars;
          return (
            <span
              key={index}
              className={cn(
                "w-1 rounded-sm",
                heightClass,
                isUnverified
                  ? "border border-base-content/30 bg-transparent"
                  : filled
                    ? BUCKET_FILL_CLASS[bucket]
                    : "bg-base-content/10",
              )}
            />
          );
        })}
      </span>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  );
}
