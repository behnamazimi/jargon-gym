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
  SettingsPanel,
  SettingsStack,
  StatusPill,
} from "@/components/jargon/settings/ui";
import { LlmProviderForm } from "@/components/jargon/settings/llm-provider-form";
import { Button } from "@/components/ui/button";
import {
  hasLlmConfigured,
  LLM_PROVIDER_OPTIONS,
  type LlmProvider,
  type UserSettings,
} from "@/lib/llm/types";

type LlmPanelProps = {
  initialSettings: UserSettings | null;
};

function getProviderLabel(settings: UserSettings | null) {
  if (!settings?.provider) return null;
  return LLM_PROVIDER_OPTIONS.find((option) => option.value === settings.provider)?.label ?? null;
}

type RemoveKeySectionProps = {
  onClear: () => void;
  isClearing: boolean;
};

function RemoveKeySection({ onClear, isClearing }: RemoveKeySectionProps) {
  return (
    <DangerZone
      title="Remove configuration"
      description="Removes your saved API key. Quizzes won't work until you add a new one."
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

export function LlmPanel({ initialSettings }: LlmPanelProps) {
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

  return (
    <SettingsPanel
      id="quiz"
      icon={Sparkles}
      title="Quiz settings"
      description="Connect an LLM provider to generate quizzes from your collections."
      status={<StatusPill variant={llmConfigured ? "connected" : "disconnected"} />}
    >
      {error ? <AlertBanner message={error} /> : null}

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
        />
      </SettingsStack>

      {llmConfigured ? <RemoveKeySection onClear={handleClear} isClearing={isClearing} /> : null}
    </SettingsPanel>
  );
}
