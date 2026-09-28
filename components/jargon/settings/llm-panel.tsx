"use client";

import { Sparkles, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  clearLlmSettingsAction,
  saveLlmSettingsAction,
} from "@/app/(private)/jargon/settings/actions";
import {
  AlertBanner,
  DangerZone,
  HighlightPanel,
  SettingsPanel,
  SettingsStack,
  StatusPill,
} from "@/components/jargon/settings/ui";
import { LlmProviderForm } from "@/components/jargon/settings/llm-provider-form";
import { Button } from "@/components/ui/button";
import {
  hasLlmConfigured,
  LLM_PROVIDER_OPTIONS,
  type AiAccessView,
  type LlmProvider,
  type UserSettings,
} from "@/lib/llm/types";

type LlmPanelProps = {
  initialSettings: UserSettings | null;
  ai: AiAccessView;
};

function getProviderLabel(settings: UserSettings | null) {
  if (!settings?.provider) return null;
  return LLM_PROVIDER_OPTIONS.find((option) => option.value === settings.provider)?.label ?? null;
}

type RemoveKeySectionProps = {
  onClear: () => void;
  isClearing: boolean;
  creditsRemaining: number | null;
};

function RemoveKeySection({ onClear, isClearing, creditsRemaining }: RemoveKeySectionProps) {
  return (
    <DangerZone
      title="Remove configuration"
      description={
        (creditsRemaining ?? 0) > 0
          ? "Removes your saved API key. AI quizzes and Stories will use your AI credits instead."
          : "Removes your saved API key. AI quizzes and Stories won't work until you add a new one."
      }
    >
      <Button
        type="button"
        variant="outline"
        onPress={onClear}
        isDisabled={isClearing}
        className="min-h-11 w-full text-error hover:bg-error/10 md:w-auto"
      >
        <Trash2 className="size-3.5" strokeWidth={1.5} />
        {isClearing ? "Removing…" : "Remove API key"}
      </Button>
    </DangerZone>
  );
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
          <p className="m-0 text-sm text-base-content/60">
            <span className="tabular-nums">{ai.remaining}</span> credits left. Used for AI quizzes
            and Stories until you add your own key.
          </p>
        </div>
        <p className="m-0 text-xs text-base-content/60">
          When you use AI credits, the terms and collection names in a quiz or story are sent to our
          AI provider.
        </p>
      </HighlightPanel>
    );
  }

  if (ai.kind === "unavailable" && ai.reason === "exhausted") {
    return (
      <HighlightPanel label="AI credits">
        <p className="m-0 text-sm text-base-content/60">
          You&apos;ve used your AI credits for now. Add your own key below to keep going.
        </p>
      </HighlightPanel>
    );
  }

  return null;
}

function FreeKeyGuide() {
  return (
    <details className="collapse collapse-arrow rounded-lg border border-base-300/80 bg-base-100">
      <summary className="collapse-title min-h-11 text-sm font-medium">
        How to get a free Google key
      </summary>
      <ol className="collapse-content m-0 space-y-1 pl-9 text-sm text-base-content/60">
        <li>
          Open{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="link"
          >
            Google AI Studio
          </a>{" "}
          and sign in.
        </li>
        <li>Choose Create API key and copy it.</li>
        <li>Pick Google as the provider below and paste the key.</li>
      </ol>
    </details>
  );
}

export function LlmPanel({ initialSettings, ai }: LlmPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [provider, setProvider] = useState<LlmProvider>(initialSettings?.provider ?? "google");
  const [apiKey, setApiKey] = useState("");
  const [replacingKey, setReplacingKey] = useState(!hasLlmConfigured(initialSettings));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isClearing, startClearTransition] = useTransition();

  function handleSaveKey() {
    setError(null);

    startSaveTransition(async () => {
      const result = await saveLlmSettingsAction({ provider, apiKey });

      if (result.error) {
        setError(result.error);
        return;
      }

      const last4 = apiKey.trim().slice(-4);
      setSettings({ provider, apiKeyLast4: last4 });
      setApiKey("");
      setReplacingKey(false);
    });
  }

  function handleClear() {
    setError(null);

    startClearTransition(async () => {
      const result = await clearLlmSettingsAction();

      if (result.error) {
        setError(result.error);
        return;
      }

      setSettings(
        settings
          ? {
              ...settings,
              provider: null,
              apiKeyLast4: null,
            }
          : null,
      );
      setReplacingKey(true);
      setApiKey("");
    });
  }

  const llmConfigured = hasLlmConfigured(settings);
  const providerLabel = getProviderLabel(settings);
  const creditsRemaining = ai.kind === "own" ? ai.creditsRemaining : null;
  const showCredits = !llmConfigured && ai.kind === "credits";

  return (
    <SettingsPanel
      id="ai"
      icon={Sparkles}
      title="AI provider"
      description="Use AI credits, or connect your own LLM provider to power AI quizzes and Stories."
      status={
        <StatusPill
          variant={llmConfigured ? "connected" : showCredits ? "credits" : "disconnected"}
        />
      }
    >
      {error ? <AlertBanner message={error} /> : null}
      {llmConfigured ? null : <AiCreditsBlock ai={ai} />}

      <SettingsStack>
        <LlmProviderForm
          settings={settings}
          llmConfigured={llmConfigured}
          providerLabel={providerLabel ?? null}
          provider={provider}
          onProviderChange={setProvider}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          replacingKey={replacingKey}
          onReplacingKeyChange={setReplacingKey}
          isSaving={isSaving}
          onSaveKey={handleSaveKey}
          creditsNote={creditsRemaining !== null}
        />
      </SettingsStack>

      {llmConfigured ? null : <FreeKeyGuide />}

      {llmConfigured ? (
        <RemoveKeySection
          onClear={handleClear}
          isClearing={isClearing}
          creditsRemaining={creditsRemaining}
        />
      ) : null}
    </SettingsPanel>
  );
}
