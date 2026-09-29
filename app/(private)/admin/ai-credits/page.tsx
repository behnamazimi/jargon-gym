import { notFound } from "next/navigation";
import { AdminAiCreditsPageClient } from "@/components/jargon/admin/admin-ai-credits-page";
import {
  getAiCreditSettingsForAdmin,
  getAiCreditSummaryForAdmin,
  listAiCreditFailureReasonsForAdmin,
  listAiCreditUsageForAdmin,
} from "@/lib/ai-credits/admin";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";

export default async function AdminAiCreditsPage() {
  const { supabase, user } = await getSessionUser();
  if (!user || !(await getUserIsAdmin(user.id))) {
    notFound();
  }

  const [settings, usage, summary, failureReasons] = await Promise.all([
    getAiCreditSettingsForAdmin(supabase),
    listAiCreditUsageForAdmin(supabase),
    getAiCreditSummaryForAdmin(supabase),
    listAiCreditFailureReasonsForAdmin(supabase),
  ]);

  return (
    <AdminAiCreditsPageClient
      settings={settings}
      usage={usage}
      summary={summary}
      failureReasons={failureReasons}
    />
  );
}
