"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import {
  clearLlmSettingsAction,
  saveLlmSettingsAction,
} from "@/app/(private)/jargon/settings/actions";
import {
  AlertBanner,
  SettingsPanel,
  SettingsRow,
  SettingsStack,
  StatusPill,
} from "@/components/jargon/settings/ui";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  hasLlmConfigured,
  LLM_PROVIDER_OPTIONS,
  type LlmProvider,
  type UserSettings,
} from "@/lib/llm/types";

type LlmPanelProps = {
  initialSettings: UserSettings | null;
};

export function LlmPanel({ initialSettings }: LlmPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [provider, setProvider] = useState<LlmProvider>(initialSettings?.provider ?? "google");
  const [apiKey, setApiKey] = useState("");
  const [replacingKey, setReplacingKey] = useState(!hasLlmConfigured(initialSettings));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  async function handleSaveKey() {
    setError(null);
    setIsSaving(true);

    const result = await saveLlmSettingsAction({ provider, apiKey });
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    const last4 = apiKey.trim().slice(-4);
    setSettings({ provider, apiKeyLast4: last4 });
    setApiKey("");
    setReplacingKey(false);
  }

  async function handleClear() {
    setError(null);
    setIsClearing(true);

    const result = await clearLlmSettingsAction();
    setIsClearing(false);

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
  }

  const llmConfigured = hasLlmConfigured(settings);
  const providerLabel = settings?.provider
    ? LLM_PROVIDER_OPTIONS.find((option) => option.value === settings.provider)?.label
    : null;

  return (
    <SettingsPanel
      id="quiz"
      title="Quiz settings"
      description="Connect an LLM provider to generate quizzes from your collections."
      status={<StatusPill variant={llmConfigured ? "connected" : "disconnected"} />}
    >
      {error ? <AlertBanner message={error} /> : null}

      <SettingsStack>
        <SettingsRow
          title="LLM provider"
          description={
            llmConfigured
              ? `${providerLabel} key ending in ${settings?.apiKeyLast4}. Keys stay encrypted and are only used for quiz generation.`
              : "Your key stays encrypted and is only used to generate quizzes."
          }
        >
          <Field>
            <FieldLabel htmlFor="llm-provider">Provider</FieldLabel>
            <Select
              selectedKey={provider}
              onSelectionChange={(key) => setProvider(key as LlmProvider)}
              isDisabled={isSaving}
            >
              <SelectTrigger id="llm-provider" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LLM_PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} id={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {llmConfigured && !replacingKey ? (
            <div className="space-y-2">
              <p className="m-0 text-sm text-base-content/60">Key saved.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onPress={() => setReplacingKey(true)}
              >
                Replace key
              </Button>
            </div>
          ) : (
            <Field>
              <FieldLabel htmlFor="llm-api-key">API key</FieldLabel>
              <Input
                id="llm-api-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Paste your API key"
                className="text-sm"
                autoComplete="off"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  onPress={handleSaveKey}
                  isDisabled={isSaving || !apiKey.trim()}
                  className="text-sm"
                >
                  {isSaving ? "Saving…" : llmConfigured ? "Save new key" : "Save key"}
                </Button>
                {llmConfigured && replacingKey ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setReplacingKey(false);
                      setApiKey("");
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </Field>
          )}
        </SettingsRow>

        {llmConfigured ? (
          <SettingsRow
            title="Remove configuration"
            description="Removes your saved API key. Quizzes won't work until you add a new one."
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onPress={handleClear}
              isDisabled={isClearing}
              className="text-error hover:bg-error/10"
            >
              <Trash2 className="size-3.5" strokeWidth={1.5} />
              {isClearing ? "Removing…" : "Remove API key"}
            </Button>
          </SettingsRow>
        ) : null}
      </SettingsStack>
    </SettingsPanel>
  );
}
