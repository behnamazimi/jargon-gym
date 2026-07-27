"use client";

import { ExternalLink, Unlink } from "lucide-react";
import { useState } from "react";
import {
  disconnectTelegramAction,
  generateTelegramLinkAction,
  updateTelegramCadenceAction,
} from "@/app/(private)/jargon/settings/actions";
import {
  AlertBanner,
  CopyField,
  HighlightPanel,
  SettingsDivider,
  SettingsGroup,
  StatusPill,
} from "@/components/jargon/settings/ui";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TELEGRAM_CADENCE_OPTIONS,
  type TelegramCadence,
  type TelegramLinkStatus,
} from "@/lib/telegram/types";

type TelegramPanelProps = {
  initialStatus: TelegramLinkStatus;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

function telegramStatusVariant(
  status: TelegramLinkStatus,
): "connected" | "pending" | "disconnected" {
  if (status.connected) return "connected";
  if (status.hasPendingLink) return "pending";
  return "disconnected";
}

export function TelegramPanel({ initialStatus }: TelegramPanelProps) {
  const [status, setStatus] = useState(initialStatus);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSavingCadence, setIsSavingCadence] = useState(false);

  async function handleGenerateLink() {
    setError(null);
    setIsGenerating(true);

    const result = await generateTelegramLinkAction();
    setIsGenerating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.deepLink) {
      setDeepLink(result.deepLink);
      setStatus((prev) => ({ ...prev, hasPendingLink: true }));
    }
  }

  async function handleDisconnect() {
    setError(null);
    setIsDisconnecting(true);

    const result = await disconnectTelegramAction();
    setIsDisconnecting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setStatus({
      connected: false,
      cadence: "off",
      linkedAt: null,
      hasPendingLink: false,
    });
    setDeepLink(null);
  }

  async function handleCadenceChange(nextCadence: TelegramCadence) {
    setError(null);
    setIsSavingCadence(true);

    const result = await updateTelegramCadenceAction(nextCadence);
    setIsSavingCadence(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setStatus((prev) => ({ ...prev, cadence: nextCadence }));
  }

  const linkedSince = status.linkedAt ? formatDate(status.linkedAt) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill variant={telegramStatusVariant(status)} />
        {status.connected && linkedSince ? (
          <span className="text-xs text-base-content/60">Linked {linkedSince}</span>
        ) : null}
      </div>

      {error ? <AlertBanner message={error} /> : null}

      {!status.connected ? (
        <SettingsGroup
          title="Connect"
          description="Generate a one-time link, open it in Telegram, and tap Start. Links expire after 15 minutes."
        >
          <Button
            type="button"
            onPress={handleGenerateLink}
            isDisabled={isGenerating}
            className="text-sm"
          >
            {isGenerating ? "Generating…" : "Generate Telegram link"}
          </Button>

          {deepLink ? (
            <HighlightPanel label="Open in Telegram">
              <CopyField value={deepLink} />
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline hover:underline"
              >
                Open bot
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </HighlightPanel>
          ) : null}
        </SettingsGroup>
      ) : (
        <>
          <SettingsDivider />

          <SettingsGroup
            title="Reminders"
            description="Scheduled sends use rolling intervals from your last reminder."
          >
            <Field className="max-w-xs">
              <FieldLabel htmlFor="telegram-cadence">Cadence</FieldLabel>
              <Select
                selectedKey={status.cadence}
                onSelectionChange={(key) => handleCadenceChange(key as TelegramCadence)}
                isDisabled={isSavingCadence}
              >
                <SelectTrigger id="telegram-cadence" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TELEGRAM_CADENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} id={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </SettingsGroup>

          <SettingsDivider />

          <SettingsGroup title="Disconnect">
            <p className="text-sm text-base-content/60">
              Stop Telegram reminders and unlink this chat. You can reconnect anytime.
            </p>
            <Button
              type="button"
              variant="destructive"
              onPress={handleDisconnect}
              isDisabled={isDisconnecting}
            >
              <Unlink className="h-3.5 w-3.5" />
              {isDisconnecting ? "Disconnecting…" : "Disconnect Telegram"}
            </Button>
          </SettingsGroup>
        </>
      )}
    </div>
  );
}
