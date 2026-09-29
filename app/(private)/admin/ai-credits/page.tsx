import { notFound } from "next/navigation";
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

  const featureLabels = { quiz: "AI quiz", story: "Stories" } as const;
  const features: AiFeatureRow[] = await Promise.all(
    (["quiz", "story"] as const).map(async (feature) => {
      const [row, health] = [await getFeatureSettings(supabase, feature), featureHealth(feature)];
      return {
        feature,
        label: featureLabels[feature],
        enabled: row?.enabled ?? false,
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
