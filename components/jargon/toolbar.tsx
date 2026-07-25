import type { SortMode } from "@/lib/jargon/types";

type ToolbarProps = {
  hideKnown: boolean;
  onHideKnownChange: (value: boolean) => void;
  sortMode: SortMode;
  onSortChange: (value: SortMode) => void;
  visibleCount: number;
};

export function Toolbar({
  hideKnown,
  onHideKnownChange,
  sortMode,
  onSortChange,
  visibleCount,
}: ToolbarProps) {
  return (
    <>
      <div className="-mt-0.5 mb-2.5 text-[11.5px] text-muted">
        Tap a term to expand it · the ✓ circle marks it as known
      </div>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3.5">
          <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-muted select-none">
            <input
              type="checkbox"
              checked={hideKnown}
              onChange={(e) => onHideKnownChange(e.target.checked)}
              className="accent-accent"
            />
            Hide terms I know
          </label>
          <select
            className="cursor-pointer rounded-lg border border-border bg-surface px-2 py-[5px] text-[12.5px] text-muted"
            value={sortMode}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
            title="Change the order terms are listed in"
          >
            <option value="default">Sort: category order</option>
            <option value="az">Sort: A–Z</option>
            <option value="unknown">Sort: unknown first</option>
          </select>
        </div>
        <span className="text-[13px] text-muted">{visibleCount} shown</span>
      </div>
    </>
  );
}
