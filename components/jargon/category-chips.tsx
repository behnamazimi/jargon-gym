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

const chipClassName =
  "h-auto min-w-0 rounded-full border-none px-3 py-2 text-xs font-normal data-selected:bg-primary data-selected:text-primary-foreground bg-secondary text-foreground hover:bg-secondary hover:text-foreground data-selected:hover:bg-primary";

export function CategoryChips({
  categories,
  counts,
  totalCount,
  activeCategories,
  onToggle,
}: CategoryChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Toggle
        isSelected={activeCategories.size === 0}
        onChange={() => onToggle("All")}
        aria-label="Show every category"
        className={cn(
          chipClassName,
          activeCategories.size === 0 && "bg-primary text-primary-foreground",
        )}
      >
        All <span className="text-xs opacity-55"> {totalCount}</span>
      </Toggle>
      {categories.map((category) => (
        <Toggle
          key={category}
          isSelected={activeCategories.has(category)}
          onChange={() => onToggle(category)}
          aria-label={`Filter by ${category}`}
          className={chipClassName}
        >
          {category} <span className="text-xs opacity-55">{counts[category] ?? 0}</span>
        </Toggle>
      ))}
    </div>
  );
}
