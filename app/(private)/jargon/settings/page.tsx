import { createClient } from "@/lib/supabase/server";
import { listWidgetTokens } from "@/lib/widget/tokens";
import { WidgetSettings } from "@/components/jargon/widget-settings";

export default async function JargonSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-sm text-muted">You must be logged in to view settings.</p>
      </div>
    );
  }

  const tokens = await listWidgetTokens(supabase, user.id);

  return <WidgetSettings initialTokens={tokens} />;
}
