import type { MasteryTier } from "@/lib/jargon/mastery";
import { cn } from "@/lib/utils";

const TIER_FILL_CLASS: Record<MasteryTier, string> = {
  weak: "fill-base-content/40",
  medium: "fill-warning",
  strong: "fill-success",
};

const BAR_HEIGHTS = [5, 8, 11, 14];

/** Signal-strength style indicator: 0–4 bars filled based on score,
 *  colored by tier. Mirrors the checkmark/label pairing used elsewhere in
 *  the app — a quick-glance strength read, not a precise measurement. */
export function MasteryBars({
  score,
  tier,
  className,
}: {
  score: number;
  tier: MasteryTier;
  className?: string;
}) {
  const filledCount = Math.max(0, Math.min(4, Math.ceil(score / 25)));
  const fillClass = TIER_FILL_CLASS[tier];

  return (
    <svg
      viewBox="0 0 20 14"
      width="20"
      height="14"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      {BAR_HEIGHTS.map((height, index) => (
        <rect
          key={index}
          x={index * 5.5}
          y={14 - height}
          width="3.5"
          height={height}
          rx="0.75"
          className={index < filledCount ? fillClass : "fill-base-content/15"}
        />
      ))}
    </svg>
  );
}
