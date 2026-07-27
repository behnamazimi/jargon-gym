import { SettingsPage } from "@/components/jargon/settings/settings-page";
import { getUserLlmSettings } from "@/lib/llm/settings";
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
        <p className="text-sm text-base-content/60">You must be logged in to view settings.</p>
      </div>
    );
  }

  const [tokens, telegramStatus, llmSettings] = await Promise.all([
    listWidgetTokens(supabase, user.id),
    getTelegramLinkStatus(supabase, user.id),
    getUserLlmSettings(supabase, user.id),
  ]);

  return (
    <SettingsPage
      initialTokens={tokens}
      initialTelegramStatus={telegramStatus}
      initialLlmSettings={llmSettings}
    />
  );
}
