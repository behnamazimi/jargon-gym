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
  SettingsPanel,
  SettingsRow,
  SettingsStack,
  StatusPill,
} from "@/components/jargon/settings/ui";
import { Button, LinkButton } from "@/components/ui/button";
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
import { formatDateTime } from "@/lib/utils";

type TelegramPanelProps = {
  initialStatus: TelegramLinkStatus;
};

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

  const linkedSince = status.linkedAt ? formatDateTime(status.linkedAt) : null;

  return (
    <SettingsPanel
      id="telegram"
      title="Telegram settings"
      description="Get terms in Telegram, mark them known, or type /read anytime."
      status={<StatusPill variant={telegramStatusVariant(status)} />}
    >
      {error ? <AlertBanner message={error} /> : null}

      <SettingsStack>
        {!status.connected ? (
          <SettingsRow
            title="Connect"
            description="Generate a link, open it in Telegram, and tap Start. Don't share the link — it expires in 5 minutes."
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
                <LinkButton
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="link"
                  size="sm"
                  className="h-auto gap-1.5 p-0 text-sm"
                >
                  Open bot
                  <ExternalLink className="size-3.5" strokeWidth={1.5} />
                </LinkButton>
              </HighlightPanel>
            ) : null}
          </SettingsRow>
        ) : (
          <SettingsRow
            title="Reminders"
            description={
              linkedSince
                ? `Linked ${linkedSince}. Reminders go out on a rolling schedule from your last one.`
                : "Reminders go out on a rolling schedule from your last one."
            }
          >
            <Field>
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
          </SettingsRow>
        )}

        {status.connected ? (
          <SettingsRow
            title="Disconnect"
            description="Stop reminders and unlink this chat. You can reconnect anytime."
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onPress={handleDisconnect}
              isDisabled={isDisconnecting}
              className="text-error hover:bg-error/10"
            >
              <Unlink className="size-3.5" strokeWidth={1.5} />
              {isDisconnecting ? "Disconnecting…" : "Disconnect Telegram"}
            </Button>
          </SettingsRow>
        ) : null}
      </SettingsStack>
    </SettingsPanel>
  );
}
