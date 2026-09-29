"use client";

import { setAiCreditsEnabled } from "@/app/(private)/admin/ai-credits/actions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSettingRow } from "@/components/admin/admin-setting-row";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { AdminAiFeatures, type AiFeatureRow } from "@/components/jargon/admin/admin-ai-features";
import { AdminAiCreditsFailures } from "@/components/jargon/admin/admin-ai-credits-failures";
import { AdminAiCreditsSettings } from "@/components/jargon/admin/admin-ai-credits-settings";
import { AdminAiCreditsSummary } from "@/components/jargon/admin/admin-ai-credits-summary";
import { AdminAiCreditsUsage } from "@/components/jargon/admin/admin-ai-credits-usage";
import type {
  AiCreditFailureReason,
  AiCreditSettingsView,
  AiCreditSummary,
  AiCreditUsageRow,
} from "@/lib/ai-credits/admin";

type AdminAiCreditsPageClientProps = {
  features: AiFeatureRow[];
  settings: AiCreditSettingsView;
  usage: AiCreditUsageRow[];
  summary: AiCreditSummary;
  failureReasons: AiCreditFailureReason[];
};

export function AdminAiCreditsPageClient({
  features,
  settings,
  usage,
  summary,
  failureReasons,
}: AdminAiCreditsPageClientProps) {
  return (
    <>
      <AdminPageHeader
        title="AI credits"
        description="Let people use the app's AI key until they add their own, and see how it's going."
      />

      <AdminSettingRow
        title="AI credits on"
        description="When off, only people with their own key can use AI quizzes and Stories."
        control={
          <AdminSwitch
            label="Turn AI credits on"
            value={settings.enabled}
            save={setAiCreditsEnabled}
          />
        }
      />

      <AdminAiFeatures rows={features} />
      <AdminAiCreditsSummary summary={summary} />
      <AdminAiCreditsFailures reasons={failureReasons} />
      <AdminAiCreditsSettings settings={settings} totalPeople={summary.totalUsers} />
      <AdminAiCreditsUsage usage={usage} />
    </>
  );
}
