"use client";

import { ToggleChip } from "@/components/ui/toggle";

type CategoryChipsProps = {
  categories: string[];
  counts: Record<string, number>;
  totalCount: number;
  activeCategories: Set<string>;
  onToggle: (cat: string) => void;
};

export function CategoryChips({
  categories,
  counts,
  totalCount,
  activeCategories,
  onToggle,
}: CategoryChipsProps) {
  const allSelected = activeCategories.size === 0;

  if (categories.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <ToggleChip
        isSelected={allSelected}
        onChange={() => onToggle("All")}
        aria-label="Show every category"
      >
        All{" "}
        <span className="tabular-nums opacity-55 group-data-selected:opacity-80">{totalCount}</span>
      </ToggleChip>
      {categories.map((category) => {
        const selected = activeCategories.has(category);

        return (
          <ToggleChip
            key={category}
            isSelected={selected}
            onChange={() => onToggle(category)}
            aria-label={`Filter by ${category}`}
          >
            {category}{" "}
            <span className="tabular-nums opacity-55 group-data-selected:opacity-80">
              {counts[category] ?? 0}
            </span>
          </ToggleChip>
        );
      })}
    </div>
  );
}
