"use client";

import type { MasteryTier } from "@/lib/jargon/mastery";
import { ToggleChip } from "@/components/ui/toggle";

export type MasteryTierFilter = "all" | MasteryTier;

const TIERS: MasteryTier[] = ["weak", "medium", "strong"];

const TIER_LABEL: Record<MasteryTier, string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

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
    <div className="flex flex-wrap gap-2">
      <ToggleChip
        isSelected={activeTier === "all"}
        onChange={() => onChange("all")}
        aria-label="Show every tier"
      >
        All{" "}
        <span className="tabular-nums opacity-55 group-data-selected:opacity-80">{totalCount}</span>
      </ToggleChip>
      {TIERS.map((tier) => {
        const selected = activeTier === tier;
        return (
          <ToggleChip
            key={tier}
            isSelected={selected}
            onChange={() => onChange(tier)}
            aria-label={`Filter by ${TIER_LABEL[tier]}`}
          >
            {TIER_LABEL[tier]}{" "}
            <span className="tabular-nums opacity-55 group-data-selected:opacity-80">
              {counts[tier]}
            </span>
          </ToggleChip>
        );
      })}
    </div>
  );
}
