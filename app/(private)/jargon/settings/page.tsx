import { AdminPanel } from "@/components/jargon/settings/admin-panel";
import { LlmPanel } from "@/components/jargon/settings/llm-panel";
import { ReadModePanel } from "@/components/jargon/settings/read-mode-panel";
import { TelegramPanel } from "@/components/jargon/settings/telegram-panel";
import { ScrollToSettingsPanel, type SettingsTabId } from "@/components/jargon/settings/ui";
import { WidgetPanel } from "@/components/jargon/settings/widget-panel";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
import { getReadMode } from "@/lib/jargon/read-settings";
import { getUserSettings } from "@/lib/llm/settings";
import { getTelegramLinkStatus } from "@/lib/telegram/links";
import { listWidgetTokens } from "@/lib/widget/tokens";
import { LATEST_WIDGET_VERSION } from "@/lib/widget/version";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

function parseTab(value: string | undefined): SettingsTabId | null {
  if (
    value === "telegram" ||
    value === "widget" ||
    value === "quiz" ||
    value === "admin" ||
    value === "read"
  ) {
    return value;
  }
  return null;
}

export default async function JargonSettingsPage({ searchParams }: PageProps) {
  const [{ tab: tabParam }, { supabase, user }] = await Promise.all([
    searchParams,
    getSessionUser(),
  ]);

  if (!user) {
    return <p className="text-sm text-base-content/60">Log in to view settings.</p>;
  }

  const [isAdmin, initialSettings, telegramStatus, widgetTokens, initialReadMode] =
    await Promise.all([
      getUserIsAdmin(user.id),
      getUserSettings(supabase, user.id),
      getTelegramLinkStatus(supabase, user.id),
      listWidgetTokens(supabase, user.id),
      getReadMode(supabase, user.id),
    ]);

  const tab = parseTab(tabParam);
  const scrollTo = tab === "admin" && !isAdmin ? null : tab;

  return (
    <>
      {scrollTo ? <ScrollToSettingsPanel tab={scrollTo} /> : null}
      <LlmPanel initialSettings={initialSettings} />
      <TelegramPanel initialStatus={telegramStatus} />
      <ReadModePanel initialReadMode={initialReadMode} />
      <WidgetPanel initialTokens={widgetTokens} latestWidgetVersion={LATEST_WIDGET_VERSION} />
      {isAdmin ? <AdminPanel /> : null}
    </>
  );
}
