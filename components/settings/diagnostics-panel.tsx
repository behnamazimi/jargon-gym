"use client";

import { useId, useSyncExternalStore } from "react";
import { Stethoscope } from "lucide-react";
import { SettingsPanel, SettingsRow, SettingsStack } from "@/components/settings/ui";
import { Switch } from "@/components/ui/switch";
import {
  readViewportDebug,
  subscribeViewportDebug,
  writeViewportDebug,
} from "@/lib/viewport-debug";

export function DiagnosticsPanel() {
  const switchId = useId();
  const enabled = useSyncExternalStore(subscribeViewportDebug, readViewportDebug, () => false);

  return (
    <SettingsPanel
      id="diagnostics"
      icon={Stethoscope}
      title="Diagnostics"
      description="For reporting layout problems on your phone."
    >
      <SettingsStack>
        <SettingsRow
          layout="inline"
          htmlFor={switchId}
          title="Screen readout"
          description="Shows screen and safe-area sizes on top of the app. Send a screenshot with it on."
        >
          <Switch id={switchId} checked={enabled} onCheckedChange={writeViewportDebug} />
        </SettingsRow>
      </SettingsStack>
    </SettingsPanel>
  );
}
