import { getSettingsSetupData } from "@/app/(private)/jargon/settings/actions";
import { LlmPanel } from "@/components/jargon/settings/llm-panel";
import { TelegramPanel } from "@/components/jargon/settings/telegram-panel";
import { ScrollToSettingsPanel, type SettingsTabId } from "@/components/jargon/settings/ui";
import { WidgetPanel } from "@/components/jargon/settings/widget-panel";
import { LATEST_WIDGET_VERSION } from "@/lib/widget/version";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

function parseTab(value: string | undefined): SettingsTabId | null {
  if (value === "telegram" || value === "widget" || value === "quiz") {
    return value;
  }
  return null;
}

export default async function JargonSettingsPage({ searchParams }: PageProps) {
  const [{ tab: tabParam }, setup] = await Promise.all([searchParams, getSettingsSetupData()]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  const tab = parseTab(tabParam);

  return (
    <>
      {tab ? <ScrollToSettingsPanel tab={tab} /> : null}
      <LlmPanel initialSettings={setup.initialSettings} />
      <TelegramPanel initialStatus={setup.telegramStatus} />
      <WidgetPanel initialTokens={setup.widgetTokens} latestWidgetVersion={LATEST_WIDGET_VERSION} />
    </>
  );
}
