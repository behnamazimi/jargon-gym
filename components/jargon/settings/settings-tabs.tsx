import Link from "next/link";
import { cn } from "@/lib/utils";

export type SettingsTabId = "quiz" | "telegram" | "widget";

type SettingsTab = {
  id: SettingsTabId;
  label: string;
};

const SETTINGS_TABS: readonly SettingsTab[] = [
  { id: "quiz", label: "Quiz" },
  { id: "telegram", label: "Telegram" },
  { id: "widget", label: "Widget setup" },
] as const;

function settingsTabHref(id: SettingsTabId) {
  return id === "quiz" ? "/jargon/settings" : `/jargon/settings?tab=${id}`;
}

export function SettingsTabs({ value }: { value: SettingsTabId }) {
  return (
    <div
      role="tablist"
      aria-label="Settings sections"
      className="tabs tabs-box tabs-sm w-full flex-nowrap overflow-x-auto bg-base-100 p-1 ring-1 ring-base-content/10"
    >
      {SETTINGS_TABS.map((tab) => {
        const selected = value === tab.id;
        return (
          <Link
            key={tab.id}
            href={settingsTabHref(tab.id)}
            scroll={false}
            role="tab"
            id={`settings-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`settings-panel-${tab.id}`}
            className={cn("tab grow no-underline md:grow-0", selected && "tab-active")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
