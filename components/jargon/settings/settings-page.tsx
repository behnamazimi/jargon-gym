"use client";

import Link from "next/link";
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
    <div className="mx-auto max-w-[720px] px-5 py-7">
      <div className="mb-8">
        <Link
          href="/jargon"
          className="text-sm text-muted no-underline hover:text-foreground hover:underline"
        >
          ← Back to jargon
        </Link>
        <h1 className="mt-3 text-[22px] font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Connect review channels to your live jargon collection.
        </p>
      </div>

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
  );
}
