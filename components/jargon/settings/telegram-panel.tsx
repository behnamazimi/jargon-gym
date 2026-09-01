"use client";

import { ExternalLink, Send, Unlink } from "lucide-react";
import { useState } from "react";
import {
  disconnectTelegramAction,
  generateTelegramLinkAction,
  updateTelegramCadenceAction,
} from "@/app/(private)/jargon/settings/actions";
import {
  AlertBanner,
  CopyField,
  DangerZone,
  SettingsPanel,
  SettingsRow,
  SettingsStack,
  StatusPill,
} from "@/components/jargon/settings/ui";
import { Button, LinkButton } from "@/components/ui/button";
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
      icon={Send}
      title="Telegram settings"
      description="Get terms in Telegram, review and quiz yourself, or type /read anytime."
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
              className="min-h-11 w-full md:w-auto"
            >
              {isGenerating ? "Generating…" : "Generate Telegram link"}
            </Button>

            {deepLink ? (
              <div className="space-y-3">
                <CopyField value={deepLink} />
                <LinkButton
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  className="min-h-11 w-full md:w-auto"
                >
                  Open bot
                  <ExternalLink className="size-3.5" strokeWidth={1.5} />
                </LinkButton>
              </div>
            ) : null}
          </SettingsRow>
        ) : (
          <SettingsRow
            titleId="telegram-reminders-title"
            title="Reminders"
            description={
              linkedSince
                ? `Linked ${linkedSince}. Reminders go out on a rolling schedule from your last one.`
                : "Reminders go out on a rolling schedule from your last one."
            }
          >
            <Select
              value={status.cadence}
              onChange={(key) => handleCadenceChange(key as TelegramCadence)}
              isDisabled={isSavingCadence}
              className="w-full"
              aria-labelledby="telegram-reminders-title"
            >
              <SelectTrigger id="telegram-cadence" className="min-h-11 w-full">
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
          </SettingsRow>
        )}
      </SettingsStack>

      {status.connected ? (
        <DangerZone
          title="Disconnect"
          description="Stop reminders and unlink this chat. You can reconnect anytime."
        >
          <Button
            type="button"
            variant="outline"
            onPress={handleDisconnect}
            isDisabled={isDisconnecting}
            className="min-h-11 w-full text-error hover:bg-error/10 md:w-auto"
          >
            <Unlink className="size-3.5" strokeWidth={1.5} />
            {isDisconnecting ? "Disconnecting…" : "Disconnect Telegram"}
          </Button>
        </DangerZone>
      ) : null}
    </SettingsPanel>
  );
}
