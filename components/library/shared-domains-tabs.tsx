import { cn } from "@/lib/utils";
import type { BrowseCounts, BrowseGroup } from "@/lib/library/browse";

const TABS: Array<{ value: BrowseGroup; label: string }> = [
  { value: "builtin", label: "Built-in" },
  { value: "community", label: "Community" },
];

export const BROWSE_PANEL_ID = "browse-panel";

function neighbour(active: BrowseGroup, key: string): BrowseGroup | null {
  const index = TABS.findIndex((tab) => tab.value === active);
  if (key === "Home") return TABS[0].value;
  if (key === "End") return TABS[TABS.length - 1].value;
  if (key === "ArrowRight") return TABS[(index + 1) % TABS.length].value;
  if (key === "ArrowLeft") return TABS[(index - 1 + TABS.length) % TABS.length].value;
  return null;
}

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
      className="tabs tabs-box tabs-sm w-full flex-nowrap"
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
            tabIndex={selected ? 0 : -1}
            onKeyDown={(event) => {
              const next = neighbour(active, event.key);
              if (!next) return;
              event.preventDefault();
              onChange(next);
              document.getElementById(`browse-tab-${next}`)?.focus();
            }}
            onClick={() => onChange(tab.value)}
            className={cn("tab min-h-11 grow gap-2 md:min-h-9", selected && "tab-active")}
          >
            {tab.label}
            <span className="tabular-nums opacity-55">{counts[tab.value]}</span>
          </button>
        );
      })}
    </div>
  );
}
