import { SettingsRow } from "@/components/jargon/settings/ui";
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
import { LLM_PROVIDER_OPTIONS, type LlmProvider, type UserSettings } from "@/lib/llm/types";

type LlmProviderFormProps = {
  settings: UserSettings | null;
  llmConfigured: boolean;
  providerLabel: string | null;
  provider: LlmProvider;
  onProviderChange: (provider: LlmProvider) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  replacingKey: boolean;
  onReplacingKeyChange: (value: boolean) => void;
  isSaving: boolean;
  onSaveKey: () => void;
};

export function LlmProviderForm({
  settings,
  llmConfigured,
  providerLabel,
  provider,
  onProviderChange,
  apiKey,
  onApiKeyChange,
  replacingKey,
  onReplacingKeyChange,
  isSaving,
  onSaveKey,
}: LlmProviderFormProps) {
  return (
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
          value={provider}
          onChange={(key) => onProviderChange(key as LlmProvider)}
          isDisabled={isSaving}
          className="w-full"
        >
          <SelectTrigger id="llm-provider" className="min-h-11 w-full">
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
            onPress={() => onReplacingKeyChange(true)}
            className="min-h-11 w-full md:w-auto"
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
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder="Paste your API key"
            className="min-h-11"
            autoComplete="off"
          />
          <div className="flex flex-col gap-2 pt-1 md:flex-row">
            <Button
              type="button"
              onPress={onSaveKey}
              isDisabled={isSaving || !apiKey.trim()}
              className="min-h-11 w-full md:w-auto"
            >
              {isSaving ? "Saving…" : llmConfigured ? "Save new key" : "Save key"}
            </Button>
            {llmConfigured && replacingKey ? (
              <Button
                type="button"
                variant="ghost"
                onPress={() => {
                  onReplacingKeyChange(false);
                  onApiKeyChange("");
                }}
                className="min-h-11 w-full md:w-auto"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </Field>
      )}
    </SettingsRow>
  );
}
