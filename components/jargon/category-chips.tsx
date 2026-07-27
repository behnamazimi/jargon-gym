"use client";

import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

type CategoryChipsProps = {
  categories: string[];
  counts: Record<string, number>;
  totalCount: number;
  activeCategories: Set<string>;
  onToggle: (cat: string) => void;
};

function chipClassName(selected: boolean) {
  return cn(
    "h-7 min-h-7 rounded-lg px-3 py-0 text-xs font-normal",
    selected
      ? "border-primary bg-primary/10 text-primary hover:bg-primary/15 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-selected:border-primary data-selected:bg-primary/10 data-selected:text-primary"
      : "border-base-300/80 text-base-content hover:bg-base-200/60",
  );
}

export function CategoryChips({
  categories,
  counts,
  totalCount,
  activeCategories,
  onToggle,
}: CategoryChipsProps) {
  const allSelected = activeCategories.size === 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      <Toggle
        size="sm"
        isSelected={allSelected}
        onChange={() => onToggle("All")}
        aria-label="Show every category"
        className={chipClassName(allSelected)}
      >
        All{" "}
        <span className={cn("tabular-nums opacity-55", allSelected && "text-primary opacity-80")}>
          {totalCount}
        </span>
      </Toggle>
      {categories.map((category) => {
        const selected = activeCategories.has(category);

        return (
          <Toggle
            key={category}
            size="sm"
            isSelected={selected}
            onChange={() => onToggle(category)}
            aria-label={`Filter by ${category}`}
            className={chipClassName(selected)}
          >
            {category}{" "}
            <span className={cn("tabular-nums opacity-55", selected && "text-primary opacity-80")}>
              {counts[category] ?? 0}
            </span>
          </Toggle>
        );
      })}
    </div>
  );
}
