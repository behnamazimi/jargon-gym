"use client";

import type { MasteryTier } from "@/lib/jargon/mastery";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

export type MasteryTierFilter = "all" | MasteryTier;

const TIERS: MasteryTier[] = ["weak", "medium", "strong"];

const TIER_LABEL: Record<MasteryTier, string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

function chipClassName(selected: boolean) {
  return cn(
    "h-7 min-h-7 rounded-lg px-3 py-0 text-xs font-normal",
    selected
      ? "border-primary bg-primary/10 text-primary hover:bg-primary/15 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-selected:border-primary data-selected:bg-primary/10 data-selected:text-primary"
      : "border-base-300/80 text-base-content hover:bg-base-200/60",
  );
}

/** Single-select — one tier (or "all") active at a time, unlike the
 *  multi-select category chips this is visually modeled on. */
export function MasteryTierChips({
  counts,
  totalCount,
  activeTier,
  onChange,
}: {
  counts: Record<MasteryTier, number>;
  totalCount: number;
  activeTier: MasteryTierFilter;
  onChange: (tier: MasteryTierFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Toggle
        size="sm"
        isSelected={activeTier === "all"}
        onChange={() => onChange("all")}
        aria-label="Show every tier"
        className={chipClassName(activeTier === "all")}
      >
        All{" "}
        <span
          className={cn(
            "tabular-nums opacity-55",
            activeTier === "all" && "text-primary opacity-80",
          )}
        >
          {totalCount}
        </span>
      </Toggle>
      {TIERS.map((tier) => {
        const selected = activeTier === tier;
        return (
          <Toggle
            key={tier}
            size="sm"
            isSelected={selected}
            onChange={() => onChange(tier)}
            aria-label={`Filter by ${TIER_LABEL[tier]}`}
            className={chipClassName(selected)}
          >
            {TIER_LABEL[tier]}{" "}
            <span className={cn("tabular-nums opacity-55", selected && "text-primary opacity-80")}>
              {counts[tier]}
            </span>
          </Toggle>
        );
      })}
    </div>
  );
}
