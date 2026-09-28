import { notFound } from "next/navigation";
import { AdminAiCreditsPageClient } from "@/components/jargon/admin/admin-ai-credits-page";
import {
  getAiCreditSettingsForAdmin,
  getAiCreditSummaryForAdmin,
  listAiCreditUsageForAdmin,
} from "@/lib/ai-credits/admin";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";

export default async function AdminAiCreditsPage() {
  const { supabase, user } = await getSessionUser();
  if (!user || !(await getUserIsAdmin(user.id))) {
    notFound();
  }

  const [settings, usage, summary] = await Promise.all([
    getAiCreditSettingsForAdmin(supabase),
    listAiCreditUsageForAdmin(supabase),
    getAiCreditSummaryForAdmin(supabase),
  ]);

  return <AdminAiCreditsPageClient settings={settings} usage={usage} summary={summary} />;
}
