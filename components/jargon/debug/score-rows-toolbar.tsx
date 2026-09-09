import { Search } from "lucide-react";
import { SORT_OPTIONS, type SortOption } from "./score-rows-sort";

type ScoreRowsToolbarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  sortBy: SortOption;
  onSortByChange: (sortBy: SortOption) => void;
};

export function ScoreRowsToolbar({
  query,
  onQueryChange,
  sortBy,
  onSortByChange,
}: ScoreRowsToolbarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-base-content/40"
          aria-hidden
          strokeWidth={1.5}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search terms…"
          className="input input-sm max-w-xs pl-8"
          aria-label="Search terms"
        />
      </div>
      <select
        value={sortBy}
        onChange={(event) => onSortByChange(event.target.value as SortOption)}
        className="select select-sm"
        aria-label="Sort terms"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
