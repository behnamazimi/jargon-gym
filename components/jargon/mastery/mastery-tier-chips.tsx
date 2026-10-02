"use client";

import type { MasteryTier } from "@/lib/jargon/mastery";
import { ToggleChip } from "@/components/ui/toggle";

/** Every term sits in exactly one group, so the chip counts add up to All. */
export type MasteryGroup = "notStarted" | MasteryTier | "markedKnown";
export type MasteryTierFilter = "all" | MasteryGroup;

const GROUPS: MasteryGroup[] = ["notStarted", "weak", "medium", "strong", "markedKnown"];

const GROUP_LABEL: Record<MasteryGroup, string> = {
  notStarted: "Not started",
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
  markedKnown: "Marked known",
};

export function rowGroup(row: {
  markedKnown: boolean;
  started: boolean;
  tier: MasteryTier;
}): MasteryGroup {
  if (row.markedKnown) return "markedKnown";
  if (!row.started) return "notStarted";
  return row.tier;
}

/** Single-select — one tier (or "all") active at a time, unlike the
 *  multi-select category chips this is visually modeled on. */
export function MasteryTierChips({
  counts,
  totalCount,
  activeTier,
  onChange,
}: {
  counts: Record<MasteryGroup, number>;
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
      {GROUPS.filter((group) => counts[group] > 0 || group === activeTier).map((group) => {
        const selected = activeTier === group;
        return (
          <ToggleChip
            key={group}
            isSelected={selected}
            onChange={() => onChange(group)}
            aria-label={`Filter by ${GROUP_LABEL[group]}`}
          >
            {GROUP_LABEL[group]}{" "}
            <span className="tabular-nums opacity-55 group-data-selected:opacity-80">
              {counts[group]}
            </span>
          </ToggleChip>
        );
      })}
    </div>
  );
}
