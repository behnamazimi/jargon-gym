"use client";

import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";
import { LlmPanel } from "@/components/jargon/settings/llm-panel";
import { SettingsPanel, SettingsSection } from "@/components/jargon/settings/ui";
import { TelegramPanel } from "@/components/jargon/settings/telegram-panel";
import { WidgetPanel } from "@/components/jargon/settings/widget-panel";
import type { UserLlmSettings } from "@/lib/llm/types";
import type { TelegramLinkStatus } from "@/lib/telegram/types";
import type { WidgetTokenRow } from "@/lib/widget/types";

type SettingsPageProps = {
  initialTokens: WidgetTokenRow[];
  initialTelegramStatus: TelegramLinkStatus;
  initialLlmSettings: UserLlmSettings | null;
};

export function SettingsPage({
  initialTokens,
  initialTelegramStatus,
  initialLlmSettings,
}: SettingsPageProps) {
  return (
    <PageShell innerClassName="space-y-8">
      <PageHeader
        icon={Settings2}
        title="Settings"
        description="Connect review channels to your live jargon collection."
      />

      <div className="space-y-10">
        <SettingsSection
          title="Quiz"
          description="Connect an LLM provider to generate quizzes from your jargon collections."
        >
          <SettingsPanel>
            <LlmPanel initialSettings={initialLlmSettings} />
          </SettingsPanel>
        </SettingsSection>

        <SettingsSection
          title="Telegram"
          description="Get terms in Telegram, mark them known, or type /next anytime."
        >
          <SettingsPanel>
            <TelegramPanel initialStatus={initialTelegramStatus} />
          </SettingsPanel>
        </SettingsSection>

        <SettingsSection
          title="Desktop widget"
          description="Show live terms on your Mac with the Übersicht widget."
        >
          <SettingsPanel>
            <WidgetPanel initialTokens={initialTokens} />
          </SettingsPanel>
        </SettingsSection>
      </div>
    </PageShell>
  );
}
