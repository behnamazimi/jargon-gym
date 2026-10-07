import { cn } from "@/lib/utils";
import type { BrowseCounts, BrowseGroup } from "@/lib/library/browse";

const TABS: Array<{ value: BrowseGroup; label: string }> = [
  { value: "builtin", label: "Built-in" },
  { value: "community", label: "Community" },
];

export const BROWSE_PANEL_ID = "browse-panel";

export function SharedDomainsTabs({
  active,
  counts,
  onChange,
}: {
  active: BrowseGroup;
  counts: BrowseCounts["groups"];
  onChange: (group: BrowseGroup) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Collection source"
      className="tabs tabs-box tabs-sm w-full flex-nowrap bg-base-100 p-1 ring-1 ring-base-content/10"
    >
      {TABS.map((tab) => {
        const selected = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`browse-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={BROWSE_PANEL_ID}
            onClick={() => onChange(tab.value)}
            className={cn("tab min-h-11 grow gap-2 md:min-h-8", selected && "tab-active")}
          >
            {tab.label}
            <span className="tabular-nums opacity-55">{counts[tab.value]}</span>
          </button>
        );
      })}
    </div>
  );
}
