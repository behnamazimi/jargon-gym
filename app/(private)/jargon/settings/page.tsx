import { SettingsPage } from "@/components/jargon/settings/settings-page";
import { getUserSettings } from "@/lib/llm/settings";
import { getTelegramLinkStatus } from "@/lib/telegram/links";
import { createClient } from "@/lib/supabase/server";
import { listWidgetTokens } from "@/lib/widget/tokens";

export default async function JargonSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-sm text-base-content/60">Log in to view settings.</p>
      </div>
    );
  }

  const [tokens, telegramStatus, userSettings] = await Promise.all([
    listWidgetTokens(supabase, user.id),
    getTelegramLinkStatus(supabase, user.id),
    getUserSettings(supabase, user.id),
  ]);

  return (
    <SettingsPage
      initialTokens={tokens}
      initialTelegramStatus={telegramStatus}
      initialUserSettings={userSettings}
    />
  );
}
