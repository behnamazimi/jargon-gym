"use client";

import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { SettingsPanel, SettingsSection } from "@/components/jargon/settings/ui";
import { TelegramPanel } from "@/components/jargon/settings/telegram-panel";
import { WidgetPanel } from "@/components/jargon/settings/widget-panel";
import type { TelegramLinkStatus } from "@/lib/telegram/types";
import type { WidgetTokenRow } from "@/lib/widget/types";

type SettingsPageProps = {
  initialTokens: WidgetTokenRow[];
  initialTelegramStatus: TelegramLinkStatus;
};

export function SettingsPage({ initialTokens, initialTelegramStatus }: SettingsPageProps) {
  return (
    <div className="min-h-full bg-gradient-to-b from-primary/[0.06] via-background to-background text-foreground">
      <div className="mx-auto max-w-[720px] space-y-8 px-5 py-7 pb-20">
        <PageHeader
          icon={Settings2}
          title="Settings"
          description="Connect review channels to your live jargon collection."
          backLabel="Back to jargon"
        />

        <div className="space-y-10">
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
      </div>
    </div>
  );
}
