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
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      <button
        type="button"
        className={`flex cursor-pointer items-center gap-1.5 rounded-full border-none px-3 py-1.5 text-[12.5px] whitespace-nowrap transition-colors ${
          activeCategories.size === 0
            ? "bg-chip-active text-chip-active-foreground"
            : "bg-chip text-foreground"
        }`}
        onClick={() => onToggle("All")}
        title="Show every category"
      >
        All <span className="text-[11px] opacity-55"> {totalCount}</span>
      </button>
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          className={`flex cursor-pointer items-center gap-1.5 rounded-full border-none px-3 py-1.5 text-[12.5px] whitespace-nowrap transition-colors ${
            activeCategories.has(c)
              ? "bg-chip-active text-chip-active-foreground"
              : "bg-chip text-foreground"
          }`}
          onClick={() => onToggle(c)}
          title="Click to add or remove this category from the filter"
        >
          {c} <span className="text-[11px] opacity-55">{counts[c] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
