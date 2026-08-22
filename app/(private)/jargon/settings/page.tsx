import { AdminPanel } from "@/components/jargon/settings/admin-panel";
import { LlmPanel } from "@/components/jargon/settings/llm-panel";
import { SettingsTabs, type SettingsTabId } from "@/components/jargon/settings/settings-tabs";
import { TelegramPanel } from "@/components/jargon/settings/telegram-panel";
import { WidgetPanel } from "@/components/jargon/settings/widget-panel";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
import { getUserSettings } from "@/lib/llm/settings";
import { getTelegramLinkStatus } from "@/lib/telegram/links";
import { listWidgetTokens } from "@/lib/widget/tokens";
import { LATEST_WIDGET_VERSION } from "@/lib/widget/version";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

function parseTab(value: string | undefined): SettingsTabId {
  if (value === "telegram" || value === "widget" || value === "quiz" || value === "admin") {
    return value;
  }
  return "quiz";
}

export default async function JargonSettingsPage({ searchParams }: PageProps) {
  const [{ tab: tabParam }, { supabase, user }] = await Promise.all([
    searchParams,
    getSessionUser(),
  ]);

  if (!user) {
    return <p className="text-sm text-base-content/60">Log in to view settings.</p>;
  }

  const isAdmin = await getUserIsAdmin(user.id);
  const tab = parseTab(tabParam);
  const visibleTab = tab === "admin" && !isAdmin ? "quiz" : tab;

  return (
    <>
      <SettingsTabs value={visibleTab} isAdmin={isAdmin} />
      {visibleTab === "quiz" ? (
        <LlmPanel initialSettings={await getUserSettings(supabase, user.id)} />
      ) : null}
      {visibleTab === "telegram" ? (
        <TelegramPanel initialStatus={await getTelegramLinkStatus(supabase, user.id)} />
      ) : null}
      {visibleTab === "widget" ? (
        <WidgetPanel
          initialTokens={await listWidgetTokens(supabase, user.id)}
          latestWidgetVersion={LATEST_WIDGET_VERSION}
        />
      ) : null}
      {visibleTab === "admin" ? <AdminPanel /> : null}
    </>
  );
}
