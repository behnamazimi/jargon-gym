"use client";

import { setAiCreditsEnabled } from "@/app/(private)/admin/ai/credits/actions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSettingRow } from "@/components/admin/admin-setting-row";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { AdminAiCreditsFailures } from "@/components/admin/ai/credits/failures";
import { AdminAiCreditsSettings } from "@/components/admin/ai/credits/settings";
import { AdminAiCreditsSummary } from "@/components/admin/ai/credits/summary";
import { AdminAiCreditsUsage } from "@/components/admin/ai/credits/usage";
import type {
  AiCreditFailureReason,
  AiCreditSettingsView,
  AiCreditSummary,
  AiCreditUsageRow,
} from "@/lib/ai-credits/admin";

type AdminAiCreditsPageClientProps = {
  settings: AiCreditSettingsView;
  usage: AiCreditUsageRow[];
  summary: AiCreditSummary;
  failureReasons: AiCreditFailureReason[];
};

export function AdminAiCreditsPageClient({
  settings,
  usage,
  summary,
  failureReasons,
}: AdminAiCreditsPageClientProps) {
  return (
    <>
      <AdminPageHeader
        title="AI credits"
        description="Everyone uses the app's AI key through credits. See how it's going. Feature switches are on the AI features page."
      />

      <AdminSettingRow
        title="AI credits on"
        description="When off, nobody can use AI quizzes and Stories, and the Top up button is hidden."
        control={
          <AdminSwitch
            label="Turn AI credits on"
            value={settings.enabled}
            save={setAiCreditsEnabled}
          />
        }
      />

      <AdminAiCreditsSummary summary={summary} />
      <AdminAiCreditsFailures reasons={failureReasons} />
      <AdminAiCreditsSettings settings={settings} totalPeople={summary.totalUsers} />
      <AdminAiCreditsUsage usage={usage} />
    </>
  );
}
