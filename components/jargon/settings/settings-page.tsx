"use client";

import { Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";
import { LlmPanel } from "@/components/jargon/settings/llm-panel";
import { TelegramPanel } from "@/components/jargon/settings/telegram-panel";
import { WidgetPanel } from "@/components/jargon/settings/widget-panel";
import { SETTINGS_TABS, SettingsTabs, type SettingsTabId } from "@/components/jargon/settings/ui";
import type { UserSettings } from "@/lib/llm/types";
import type { TelegramLinkStatus } from "@/lib/telegram/types";
import type { WidgetTokenRow } from "@/lib/widget/types";

type SettingsPageProps = {
  initialTokens: WidgetTokenRow[];
  initialTelegramStatus: TelegramLinkStatus;
  initialUserSettings: UserSettings | null;
};

function isSettingsTabId(value: string): value is SettingsTabId {
  return SETTINGS_TABS.some((tab) => tab.id === value);
}

export function SettingsPage({
  initialTokens,
  initialTelegramStatus,
  initialUserSettings,
}: SettingsPageProps) {
  const [tab, setTab] = useState<SettingsTabId>("quiz");

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (isSettingsTabId(hash)) setTab(hash);
  }, []);

  function handleTabChange(next: SettingsTabId) {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
  }

  return (
    <PageShell innerClassName="mx-auto max-w-3xl space-y-6">
      <PageHeader icon={Settings2} title="Settings" />

      <SettingsTabs value={tab} onChange={handleTabChange} />

      {tab === "quiz" ? <LlmPanel initialSettings={initialUserSettings} /> : null}
      {tab === "telegram" ? <TelegramPanel initialStatus={initialTelegramStatus} /> : null}
      {tab === "widget" ? <WidgetPanel initialTokens={initialTokens} /> : null}
    </PageShell>
  );
}
