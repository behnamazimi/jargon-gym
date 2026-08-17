import type { OverallStrength } from "@/lib/smart-queue";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const BUCKET_LABEL: Record<OverallStrength, string> = {
  unverified: "Not yet tested",
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

/** `unverified` covers two different situations: a term that's been read
 *  but never tested (score > 0, driven by the Read nudge) vs. one with
 *  zero activity of any kind (score 0) — "no activity" reads more
 *  accurately than "not yet tested" when there's nothing to even hint at
 *  yet, not just no test. */
function bucketLabel(bucket: OverallStrength, score: number | undefined): string {
  if (bucket === "unverified" && (score === undefined || score <= 0)) {
    return "No activity";
  }
  return BUCKET_LABEL[bucket];
}

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
  /** 0-100, shown alongside the label. Omit to show the label alone. */
  score?: number;
  className?: string;
  /** Render the label as small text under the bars instead of a hover
   *  tooltip — for surfaces with room to spare where the label should be
   *  visible without interaction (e.g. the mastery list). Default is the
   *  tooltip, for compact surfaces like term cards. */
  caption?: boolean;
};

function BarsRow({ bars, bucket }: { bars: number; bucket: OverallStrength }) {
  return (
    <span className="inline-flex items-end gap-0.5">
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
  );
}

/** Display-only cross-context mastery indicator — collection cards, stats,
 *  the mastery overview. Never feeds back into scoring. Bar count comes
 *  straight from the score for every bucket, including `unverified` (which
 *  can be read-exposure-only, so it isn't flattened to a bare 0) — the
 *  bucket's color alone is what keeps "never tested" distinct from "tested
 *  and struggling," not a separate rendering path. Label shows either as a
 *  hover tooltip or, with `caption`, as small text under the bars. */
export function OverallStrengthBars({
  bars,
  bucket,
  score,
  className,
  caption = false,
}: OverallStrengthBarsProps) {
  const resolvedLabel = bucketLabel(bucket, score);
  const label =
    score !== undefined && score > 0 ? `${resolvedLabel} (${score}/100)` : resolvedLabel;

  if (caption) {
    return (
      <span
        className={cn("inline-flex flex-col items-end gap-1", className)}
        aria-label={`Overall strength: ${label}`}
      >
        <BarsRow bars={bars} bucket={bucket} />
        <span className="text-[10px] leading-none text-base-content/50">{label}</span>
      </span>
    );
  }

  return (
    <TooltipTrigger delay={150}>
      <span className={className} aria-label={`Overall strength: ${label}`}>
        <BarsRow bars={bars} bucket={bucket} />
      </span>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  );
}
