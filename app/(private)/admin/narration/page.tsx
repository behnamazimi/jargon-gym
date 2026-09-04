import { notFound } from "next/navigation";
import { AdminNarrationPageClient } from "@/components/jargon/admin/admin-narration-page";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
import { listNarrationAllowlistForAdmin } from "@/lib/jargon/admin/list-narration-allowlist";
import { getNarrationSettingsForAdmin } from "@/lib/jargon/admin/narration-settings";

export default async function AdminNarrationPage() {
  const { supabase, user } = await getSessionUser();
  if (!user || !(await getUserIsAdmin(user.id))) {
    notFound();
  }

  const [settings, allowlist] = await Promise.all([
    getNarrationSettingsForAdmin(supabase),
    listNarrationAllowlistForAdmin(supabase),
  ]);

  return <AdminNarrationPageClient enabled={settings.enabled} allowlist={allowlist} />;
}
