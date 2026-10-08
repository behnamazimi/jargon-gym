"use client";

import { Sparkles } from "lucide-react";
import { TopUpButton } from "@/components/ai-credits/top-up-button";
import { HighlightPanel, SettingsPanel } from "@/components/settings/ui";
import { TOPUP_COPY } from "@/lib/ai-credits/topup-copy";
import type { TopUpState } from "@/lib/ai-credits/types";
import type { AiAccessView } from "@/lib/llm/types";

/** The free top-up, only when it will work, or when today's has been used. */
function FreeCredits({ topUp }: { topUp: TopUpState | undefined }) {
  if (topUp?.available) {
    return (
      <div className="space-y-2">
        <p className="m-0 text-sm font-medium">{TOPUP_COPY.eligible(topUp.amount)}</p>
        <TopUpButton size="sm" amount={topUp.amount} />
      </div>
    );
  }
  if (topUp?.reason === "already-today") {
    return <p className="m-0 text-sm text-base-content/70">{TOPUP_COPY.alreadyToday}</p>;
  }
  return null;
}

function AiCreditsBlock({ ai }: { ai: AiAccessView }) {
  if (ai.kind === "credits") {
    const label = `${ai.remaining} of ${ai.total} credits left`;
    return (
      <HighlightPanel label="AI credits">
        <div className="space-y-2">
          <progress
            className="progress progress-primary h-1.5 w-full"
            value={ai.remaining}
            max={ai.total}
            aria-label={label}
          />
          <p className="m-0 text-sm text-base-content/70">
            <span className="tabular-nums">{ai.remaining}</span> credits left.
          </p>
        </div>
        <FreeCredits topUp={ai.topUp} />
        <p className="m-0 text-xs text-base-content/70">
          When you use AI credits, the terms, definitions and any outline you write are sent to our
          AI provider.
        </p>
      </HighlightPanel>
    );
  }

  if (ai.reason === "exhausted") {
    return (
      <HighlightPanel label="AI credits">
        <p className="m-0 text-sm text-base-content/70">
          You&apos;ve used your AI credits for now.
        </p>
        <FreeCredits topUp={ai.topUp} />
      </HighlightPanel>
    );
  }

  return (
    <HighlightPanel label="AI credits">
      <p className="m-0 text-sm text-base-content/70">AI isn&apos;t available right now.</p>
    </HighlightPanel>
  );
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
