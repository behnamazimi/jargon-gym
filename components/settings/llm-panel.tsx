"use client";

import { Sparkles } from "lucide-react";
import { TopUpButton } from "@/components/ai-credits/top-up-button";
import { SettingsPanel, SettingsRow, SettingsStack } from "@/components/settings/ui";
import { TOPUP_COPY } from "@/lib/ai-credits/topup-copy";
import type { TopUpState } from "@/lib/ai-credits/types";
import type { AiAccessView } from "@/lib/llm/types";

function freeCreditsCopy(topUp: TopUpState | undefined): string | null {
  if (topUp?.available) return TOPUP_COPY.eligible(topUp.amount);
  if (topUp?.reason === "already-today") return TOPUP_COPY.alreadyToday;
  if (topUp?.reason === "balance") return TOPUP_COPY.whenNearlyOut;
  return null;
}

function FreeCreditsRow({ topUp }: { topUp: TopUpState | undefined }) {
  const copy = freeCreditsCopy(topUp);
  if (!copy) return null;

  return (
    <SettingsRow title="Free credits" description={copy}>
      {topUp?.available ? (
        <TopUpButton amount={topUp.amount} className="min-h-11 w-full md:w-auto" />
      ) : null}
    </SettingsRow>
  );
}

function AiCreditsBlock({ ai }: { ai: AiAccessView }) {
  if (ai.kind === "credits") {
    const label = `${ai.remaining} of ${ai.total} credits left`;
    return (
      <>
        <SettingsStack>
          <SettingsRow title="Balance" description={`${label}.`}>
            <progress
              className="progress progress-primary h-1.5 w-full"
              value={ai.remaining}
              max={ai.total}
              aria-label={label}
            />
          </SettingsRow>
          <FreeCreditsRow topUp={ai.topUp} />
        </SettingsStack>
        <p className="m-0 text-xs text-base-content/70">
          When you use AI credits, the terms, definitions and any outline you write are sent to our
          AI provider.
        </p>
      </>
    );
  }

  if (ai.reason === "exhausted") {
    return (
      <SettingsStack>
        <SettingsRow title="Balance" description="No credits left.">
          {null}
        </SettingsRow>
        <FreeCreditsRow topUp={ai.topUp} />
      </SettingsStack>
    );
  }

  return <p className="m-0 text-sm text-base-content/70">AI isn&apos;t available right now.</p>;
}

export function LlmPanel({ ai }: { ai: AiAccessView }) {
  return (
    <SettingsPanel
      id="ai"
      icon={Sparkles}
      title="AI credits"
      description="Power AI quizzes and Stories."
    >
      <AiCreditsBlock ai={ai} />
    </SettingsPanel>
  );
}
