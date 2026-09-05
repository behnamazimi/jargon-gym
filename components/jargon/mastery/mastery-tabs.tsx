import { ListChecks, Signal } from "lucide-react";
import { cn } from "@/lib/utils";

export type MasteryTab = "overview" | "terms";

const TAB_OPTIONS: Array<{ value: MasteryTab; label: string; icon: typeof Signal }> = [
  { value: "overview", label: "Overview", icon: Signal },
  { value: "terms", label: "Terms", icon: ListChecks },
];

export function MasteryTabs({
  active,
  onChange,
}: {
  active: MasteryTab;
  onChange: (tab: MasteryTab) => void;
}) {
  return (
    <div
      role="tablist"
      className="tabs tabs-box tabs-sm w-full flex-nowrap bg-base-100 p-1 ring-1 ring-base-content/10"
    >
      {TAB_OPTIONS.map((option) => {
        const selected = option.value === active;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn("tab grow gap-1.5", selected && "tab-active")}
          >
            <Icon className="size-3.5" aria-hidden strokeWidth={1.5} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
