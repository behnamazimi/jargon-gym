"use client";

import { Send, Unlink } from "lucide-react";
import { useState, useTransition } from "react";
import {
  disconnectTelegramAction,
  generateTelegramLinkAction,
  updateTelegramCadenceAction,
} from "@/app/(private)/jargon/settings/actions";
import {
  AlertBanner,
  DangerZone,
  SettingsPanel,
  SettingsStack,
  StatusPill,
} from "@/components/jargon/settings/ui";
import { TelegramConnectRow } from "@/components/jargon/settings/telegram-connect-row";
import { TelegramRemindersRow } from "@/components/jargon/settings/telegram-reminders-row";
import { Button } from "@/components/ui/button";
import { type TelegramCadence, type TelegramLinkStatus } from "@/lib/telegram/types";
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
  const [isGenerating, startGenerateTransition] = useTransition();
  const [isDisconnecting, startDisconnectTransition] = useTransition();
  const [isSavingCadence, startCadenceTransition] = useTransition();

  function handleGenerateLink() {
    setError(null);

    startGenerateTransition(async () => {
      const result = await generateTelegramLinkAction();

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.deepLink) {
        setDeepLink(result.deepLink);
        setStatus((prev) => ({ ...prev, hasPendingLink: true }));
      }
    });
  }

  function handleDisconnect() {
    setError(null);

    startDisconnectTransition(async () => {
      const result = await disconnectTelegramAction();

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
    });
  }

  function handleCadenceChange(nextCadence: TelegramCadence) {
    setError(null);

    startCadenceTransition(async () => {
      const result = await updateTelegramCadenceAction(nextCadence);

      if (result.error) {
        setError(result.error);
        return;
      }

      setStatus((prev) => ({ ...prev, cadence: nextCadence }));
    });
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
          <TelegramConnectRow
            isGenerating={isGenerating}
            onGenerateLink={handleGenerateLink}
            deepLink={deepLink}
          />
        ) : (
          <TelegramRemindersRow
            linkedSince={linkedSince}
            cadence={status.cadence}
            isSavingCadence={isSavingCadence}
            onCadenceChange={handleCadenceChange}
          />
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
