"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { clearLlmSettingsAction } from "@/app/(private)/jargon/settings/actions";
import { Button } from "@/components/ui/button";
import type { AiAccessView, AiFailureReason } from "@/lib/llm/types";

/** Offered when the user's own key failed and AI credits could take over.
 *  Removes the saved key so the next try uses credits. */
export function CreditsInsteadButton({
  ai,
  reason,
  onSwitched,
  onError,
}: {
  ai: AiAccessView;
  reason: AiFailureReason | null;
  onSwitched: () => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [isSwitching, startSwitching] = useTransition();

  if (reason !== "own-key" || ai.kind !== "own" || (ai.creditsRemaining ?? 0) <= 0) return null;

  function handleSwitch() {
    startSwitching(async () => {
      const result = await clearLlmSettingsAction();
      if (result.error) {
        onError(result.error);
        return;
      }
      router.refresh();
      onSwitched();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onPress={handleSwitch}
      isDisabled={isSwitching}
      className="min-h-11"
    >
      {isSwitching ? "Removing key…" : "Remove my key, use AI credits"}
    </Button>
  );
}
