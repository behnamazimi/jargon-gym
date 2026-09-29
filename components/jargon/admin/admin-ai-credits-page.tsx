"use client";

import { useState, useTransition } from "react";
import { setAiCreditsEnabled } from "@/app/(private)/admin/ai-credits/actions";
import { AdminAiFeatures, type AiFeatureRow } from "@/components/jargon/admin/admin-ai-features";
import { AdminAiCreditsFailures } from "@/components/jargon/admin/admin-ai-credits-failures";
import { AdminAiCreditsSettings } from "@/components/jargon/admin/admin-ai-credits-settings";
import { AdminAiCreditsSummary } from "@/components/jargon/admin/admin-ai-credits-summary";
import { AdminAiCreditsUsage } from "@/components/jargon/admin/admin-ai-credits-usage";
import { AdminNav } from "@/components/jargon/admin/admin-nav";
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
  const [enabled, setEnabled] = useState(settings.enabled);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(value: boolean) {
    setToggleError(null);
    const previous = enabled;
    setEnabled(value);

    startTransition(async () => {
      const result = await setAiCreditsEnabled(value);
      if (result.error) {
        setEnabled(previous);
        setToggleError(result.error);
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <div className="max-md:sr-only">
        <h1 className="text-2xl font-semibold text-base-content">AI credits</h1>
        <p className="mt-1 text-base text-base-content/65">
          Let people use the app&apos;s AI key until they add their own, and see how it&apos;s
          going.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-base-300 px-4 py-3">
        <div>
          <p className="m-0 font-medium text-base-content">AI credits on</p>
          <p className="m-0 text-sm text-base-content/65">
            When off, only people with their own key can use AI quizzes and Stories.
          </p>
          {toggleError ? (
            <p role="alert" className="mt-1 text-sm text-error">
              {toggleError}
            </p>
          ) : null}
        </div>
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={enabled}
          disabled={isPending}
          onChange={(event) => handleToggle(event.target.checked)}
          aria-label="Turn AI credits on"
        />
      </div>

      <AdminAiFeatures rows={features} />
      <AdminAiCreditsSummary summary={summary} />
      <AdminAiCreditsFailures reasons={failureReasons} />
      <AdminAiCreditsSettings settings={settings} />
      <AdminAiCreditsUsage usage={usage} />
    </div>
  );
}
