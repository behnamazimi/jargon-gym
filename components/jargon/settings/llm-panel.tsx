"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import {
  clearLlmSettingsAction,
  saveLlmSettingsAction,
  updateQuizPreferencesAction,
} from "@/app/(private)/jargon/settings/actions";
import {
  AlertBanner,
  SettingsDivider,
  SettingsGroup,
  StatusPill,
} from "@/components/jargon/settings/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LLM_PROVIDER_OPTIONS, type LlmProvider, type UserLlmSettings } from "@/lib/llm/types";

type LlmPanelProps = {
  initialSettings: UserLlmSettings | null;
};

export function LlmPanel({ initialSettings }: LlmPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [provider, setProvider] = useState<LlmProvider>(initialSettings?.provider ?? "google");
  const [apiKey, setApiKey] = useState("");
  const [replacingKey, setReplacingKey] = useState(!initialSettings);
  const [markUnknownOnFail, setMarkUnknownOnFail] = useState(
    initialSettings?.markUnknownOnFail ?? true,
  );
  const [markKnownOnPass, setMarkKnownOnPass] = useState(initialSettings?.markKnownOnPass ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

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
    setSettings({
      provider,
      apiKeyLast4: last4,
      markUnknownOnFail,
      markKnownOnPass,
    });
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

    setSettings(null);
    setReplacingKey(true);
    setApiKey("");
  }

  async function handlePreferenceChange(next: {
    markUnknownOnFail?: boolean;
    markKnownOnPass?: boolean;
  }) {
    if (!settings) return;

    const nextMarkUnknownOnFail = next.markUnknownOnFail ?? markUnknownOnFail;
    const nextMarkKnownOnPass = next.markKnownOnPass ?? markKnownOnPass;

    setMarkUnknownOnFail(nextMarkUnknownOnFail);
    setMarkKnownOnPass(nextMarkKnownOnPass);
    setError(null);
    setIsSavingPrefs(true);

    const result = await updateQuizPreferencesAction({
      markUnknownOnFail: nextMarkUnknownOnFail,
      markKnownOnPass: nextMarkKnownOnPass,
    });
    setIsSavingPrefs(false);

    if (result.error) {
      setError(result.error);
      setMarkUnknownOnFail(settings.markUnknownOnFail);
      setMarkKnownOnPass(settings.markKnownOnPass);
      return;
    }

    setSettings({
      ...settings,
      markUnknownOnFail: nextMarkUnknownOnFail,
      markKnownOnPass: nextMarkKnownOnPass,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill variant={settings ? "connected" : "disconnected"} />
        {settings ? (
          <span className="text-[12px] text-muted-foreground">
            {LLM_PROVIDER_OPTIONS.find((option) => option.value === settings.provider)?.label} ·
            ••••
            {settings.apiKeyLast4}
          </span>
        ) : null}
      </div>

      {error ? <AlertBanner message={error} /> : null}

      <SettingsGroup
        title="LLM provider"
        description="Your API key is encrypted at rest and used only server-side when generating quizzes."
      >
        <Field className="max-w-xs">
          <FieldLabel htmlFor="llm-provider">Provider</FieldLabel>
          <Select
            selectedKey={provider}
            onSelectionChange={(key) => setProvider(key as LlmProvider)}
            isDisabled={isSaving}
          >
            <SelectTrigger id="llm-provider" className="text-[13px]">
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

        {settings && !replacingKey ? (
          <div className="space-y-3">
            <p className="m-0 text-[13px] text-muted-foreground">
              API key configured. Replace it if you need to switch keys.
            </p>
            <Button type="button" variant="outline" size="sm" onPress={() => setReplacingKey(true)}>
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
              className="text-[13px]"
              autoComplete="off"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                onPress={handleSaveKey}
                isDisabled={isSaving || !apiKey.trim()}
                className="text-[13px]"
              >
                {isSaving ? "Saving…" : settings ? "Save new key" : "Save key"}
              </Button>
              {settings && replacingKey ? (
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
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup
        title="Quiz progress"
        description="Choose whether quiz results update your known/unknown term status."
      >
        <Field orientation="horizontal">
          <Checkbox
            id="mark-unknown-on-fail"
            isSelected={markUnknownOnFail}
            isDisabled={!settings || isSavingPrefs}
            onChange={(checked) => handlePreferenceChange({ markUnknownOnFail: checked })}
          />
          <FieldLabel htmlFor="mark-unknown-on-fail">
            Mark known terms as unknown when I fail a quiz question
          </FieldLabel>
        </Field>

        <Field orientation="horizontal">
          <Checkbox
            id="mark-known-on-pass"
            isSelected={markKnownOnPass}
            isDisabled={!settings || isSavingPrefs}
            onChange={(checked) => handlePreferenceChange({ markKnownOnPass: checked })}
          />
          <FieldLabel htmlFor="mark-known-on-pass">
            Mark unknown terms as known when I pass a quiz question
          </FieldLabel>
        </Field>

        {!settings ? (
          <FieldDescription>Save an API key to enable quiz progress settings.</FieldDescription>
        ) : null}
      </SettingsGroup>

      {settings ? (
        <>
          <SettingsDivider />
          <SettingsGroup title="Remove configuration">
            <Button
              type="button"
              variant="outline"
              onPress={handleClear}
              isDisabled={isClearing}
              className="text-[13px] text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isClearing ? "Removing…" : "Remove API key"}
            </Button>
          </SettingsGroup>
        </>
      ) : null}
    </div>
  );
}
