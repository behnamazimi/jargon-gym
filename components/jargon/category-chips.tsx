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
    "h-7 min-h-7 rounded-full px-3 py-0 text-xs font-normal",
    selected
      ? "border border-primary bg-transparent text-primary hover:bg-primary/10 hover:text-primary aria-pressed:border-primary aria-pressed:bg-transparent aria-pressed:text-primary data-[state=on]:border-primary data-[state=on]:bg-transparent data-[state=on]:text-primary data-selected:border-primary data-selected:bg-transparent data-selected:text-primary"
      : "border border-transparent bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground",
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
        <span className={cn("text-xs opacity-55", allSelected && "text-primary opacity-80")}>
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
            <span className={cn("text-xs opacity-55", selected && "text-primary opacity-80")}>
              {counts[category] ?? 0}
            </span>
          </Toggle>
        );
      })}
    </div>
  );
}
