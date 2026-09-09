import { SettingsRow } from "@/components/jargon/settings/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TELEGRAM_CADENCE_OPTIONS, type TelegramCadence } from "@/lib/telegram/types";

type TelegramRemindersRowProps = {
  linkedSince: string | null;
  cadence: TelegramCadence;
  isSavingCadence: boolean;
  onCadenceChange: (cadence: TelegramCadence) => void;
};

export function TelegramRemindersRow({
  linkedSince,
  cadence,
  isSavingCadence,
  onCadenceChange,
}: TelegramRemindersRowProps) {
  return (
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
        value={cadence}
        onChange={(key) => onCadenceChange(key as TelegramCadence)}
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
  );
}
