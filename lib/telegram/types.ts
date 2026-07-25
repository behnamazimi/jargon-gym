export type TelegramCadence = "off" | "6h" | "12h" | "24h";

export type TelegramLinkStatus = {
  connected: boolean;
  cadence: TelegramCadence;
  linkedAt: string | null;
  hasPendingLink: boolean;
};

export const TELEGRAM_CADENCE_OPTIONS: { value: TelegramCadence; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "6h", label: "Every 6 hours" },
  { value: "12h", label: "Every 12 hours" },
  { value: "24h", label: "Daily" },
];
