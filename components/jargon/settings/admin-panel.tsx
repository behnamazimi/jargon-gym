"use client";

import { setShowAdminUi, useIsAdmin, useShowAdminUi } from "@/components/admin-only";
import { SettingsPanel, SettingsRow, SettingsStack } from "@/components/jargon/settings/ui";
import { Switch } from "@/components/ui/switch";

export function AdminPanel() {
  const isAdmin = useIsAdmin();
  const showAdminUi = useShowAdminUi();

  if (!isAdmin) return null;

  return (
    <SettingsPanel
      id="admin"
      title="Admin"
      description="Local debug overlays for this browser. Off by default — they never appear for non-admins."
    >
      <SettingsStack>
        <SettingsRow
          title="Study debug overlays"
          description="Show pick-reason badges and queue scores on Read and Review cards. Stored only on this device."
        >
          <Switch
            id="show-admin-ui"
            checked={showAdminUi}
            onCheckedChange={setShowAdminUi}
            aria-label="Show study debug overlays"
          />
        </SettingsRow>
      </SettingsStack>
    </SettingsPanel>
  );
}
