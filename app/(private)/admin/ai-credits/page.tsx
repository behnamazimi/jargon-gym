import { AdminAiCreditsPageClient } from "@/components/jargon/admin/admin-ai-credits-page";
import {
  getAiCreditSettingsForAdmin,
  getAiCreditSummaryForAdmin,
  listAiCreditFailureReasonsForAdmin,
  listAiCreditUsageForAdmin,
} from "@/lib/ai-credits/admin";
import { featureHealth } from "@/lib/ai/health";
import { getFeatureSettings } from "@/lib/ai/feature-settings";
import type { AiFeatureRow } from "@/components/jargon/admin/admin-ai-features";
import { requireAdminPage } from "@/lib/admin/page-guard";

export default async function AdminAiCreditsPage() {
  const { supabase } = await requireAdminPage();

  const [settings, usage, summary, failureReasons] = await Promise.all([
    getAiCreditSettingsForAdmin(supabase),
    listAiCreditUsageForAdmin(supabase),
    getAiCreditSummaryForAdmin(supabase),
    listAiCreditFailureReasonsForAdmin(supabase),
  ]);

  const featureLabels = { quiz: "AI quiz", story: "Stories" } as const;
  const features: AiFeatureRow[] = await Promise.all(
    (["quiz", "story"] as const).map(async (feature) => {
      const health = featureHealth(feature);
      const row = await getFeatureSettings(supabase, feature).catch((error: unknown) => {
        console.error("Couldn't read AI feature settings:", error);
        return null;
      });
      return {
        feature,
        label: featureLabels[feature],
        enabled: row?.enabled ?? null,
        healthNote: health.ok ? null : health.note,
      };
    }),
  );

  return (
    <AdminAiCreditsPageClient
      features={features}
      settings={settings}
      usage={usage}
      summary={summary}
      failureReasons={failureReasons}
    />
  );
}
