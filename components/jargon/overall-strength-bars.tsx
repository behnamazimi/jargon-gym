import type { OverallStrength } from "@/lib/smart-queue";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const BUCKET_LABEL: Record<OverallStrength, string> = {
  unverified: "Not yet tested",
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

/** unverified gets its own neutral color, never weak/medium/strong's
 *  red/yellow/green — that's what keeps "never tested" visually distinct
 *  from "tested and struggling" now that both buckets fill bars the same
 *  way (see computeOverallStrength). */
const BUCKET_FILL_CLASS: Record<OverallStrength, string> = {
  unverified: "bg-base-content/35",
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

/** Display-only cross-context mastery indicator — collection cards, stats,
 *  the mastery overview. Never feeds back into scoring. Bar count comes
 *  straight from the score for every bucket, including `unverified` (which
 *  can be read-exposure-only, so it isn't flattened to a bare 0) — the
 *  bucket's color alone is what keeps "never tested" distinct from "tested
 *  and struggling," not a separate rendering path. Hover/focus reveals the
 *  label (and score, when nonzero) as a tooltip. */
export function OverallStrengthBars({ bars, bucket, score, className }: OverallStrengthBarsProps) {
  const label =
    score !== undefined && score > 0
      ? `${BUCKET_LABEL[bucket]} (${score}/100)`
      : BUCKET_LABEL[bucket];

  return (
    <TooltipTrigger delay={150}>
      <span
        className={cn("inline-flex items-end gap-0.5", className)}
        aria-label={`Overall strength: ${label}`}
      >
        {BAR_HEIGHT_CLASS.map((heightClass, index) => {
          const filled = index < bars;
          return (
            <span
              key={index}
              className={cn(
                "w-1 rounded-sm",
                heightClass,
                filled ? BUCKET_FILL_CLASS[bucket] : "bg-base-content/10",
              )}
            />
          );
        })}
      </span>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  );
}
