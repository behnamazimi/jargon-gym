"use client";

import { BookOpen } from "lucide-react";
import { useState } from "react";
import { updateReadModeAction } from "@/app/(private)/jargon/settings/actions";
import {
  AlertBanner,
  SettingsPanel,
  SettingsRow,
  SettingsStack,
} from "@/components/jargon/settings/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { READ_MODE_OPTIONS, type ReadMode } from "@/lib/jargon/read-settings";

type ReadModePanelProps = {
  initialReadMode: ReadMode;
};

export function ReadModePanel({ initialReadMode }: ReadModePanelProps) {
  const [readMode, setReadMode] = useState(initialReadMode);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(next: ReadMode) {
    setError(null);
    setIsSaving(true);

    const result = await updateReadModeAction(next);
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setReadMode(next);
  }

  return (
    <SettingsPanel
      id="read"
      icon={BookOpen}
      title="Read settings"
      description="Choose what Read shows once you've caught up on unknown terms."
    >
      {error ? <AlertBanner message={error} /> : null}
      <SettingsStack>
        <SettingsRow
          titleId="read-mode-title"
          title="When you're caught up"
          description="Stop, or keep reading known terms starting with the ones you've seen least recently."
        >
          <Select
            value={readMode}
            onChange={(key) => handleChange(key as ReadMode)}
            isDisabled={isSaving}
            className="w-full"
            aria-labelledby="read-mode-title"
          >
            <SelectTrigger id="read-mode" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {READ_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} id={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsStack>
    </SettingsPanel>
  );
}
