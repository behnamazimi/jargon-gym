"use client";

import { LayoutDashboard, MessageCircle, Settings2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";
import { LlmPanel } from "@/components/jargon/settings/llm-panel";
import { SettingsCard } from "@/components/jargon/settings/ui";
import { TelegramPanel } from "@/components/jargon/settings/telegram-panel";
import { WidgetPanel } from "@/components/jargon/settings/widget-panel";
import type { UserSettings } from "@/lib/llm/types";
import type { TelegramLinkStatus } from "@/lib/telegram/types";
import type { WidgetTokenRow } from "@/lib/widget/types";

type SettingsPageProps = {
  initialTokens: WidgetTokenRow[];
  initialTelegramStatus: TelegramLinkStatus;
  initialUserSettings: UserSettings | null;
};

export function SettingsPage({
  initialTokens,
  initialTelegramStatus,
  initialUserSettings,
}: SettingsPageProps) {
  return (
    <PageShell innerClassName="space-y-8">
      <PageHeader
        icon={Settings2}
        title="Settings"
        description="Connect Telegram, widgets, and quiz generation."
      />

      <div className="space-y-6">
        <SettingsCard
          icon={Sparkles}
          title="Quiz"
          description="Connect an LLM provider to generate quizzes from your collections."
        >
          <LlmPanel initialSettings={initialUserSettings} />
        </SettingsCard>

        <SettingsCard
          icon={MessageCircle}
          title="Telegram"
          description="Get terms in Telegram, mark them known, or type /read anytime."
        >
          <TelegramPanel initialStatus={initialTelegramStatus} />
        </SettingsCard>

        <SettingsCard
          icon={LayoutDashboard}
          title="Desktop widget"
          description="Show live terms on your Mac with the Übersicht widget."
        >
          <WidgetPanel initialTokens={initialTokens} />
        </SettingsCard>
      </div>
    </PageShell>
  );
}
