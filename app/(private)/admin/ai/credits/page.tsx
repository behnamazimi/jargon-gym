import { AdminAiCreditsPageClient } from "@/components/admin/ai/credits/page";
import {
  getAiCreditSettingsForAdmin,
  getAiCreditSummaryForAdmin,
  listAiCreditFailureReasonsForAdmin,
  listAiCreditUsageForAdmin,
} from "@/lib/ai-credits/admin";
import { requireAdminPage } from "@/lib/admin/page-guard";

export default async function AdminAiCreditsPage() {
  const { supabase } = await requireAdminPage();

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
