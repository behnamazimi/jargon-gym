"use client";

import { Sparkles } from "lucide-react";
import { TopUpButton } from "@/components/ai-credits/top-up-button";
import { HighlightPanel, SettingsPanel } from "@/components/settings/ui";
import type { AiAccessView } from "@/lib/llm/types";

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
          You&apos;ve used your AI credits for now. Top up to keep going.
        </p>
        <TopUpButton size="sm" />
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
