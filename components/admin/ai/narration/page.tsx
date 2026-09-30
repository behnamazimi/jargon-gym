"use client";

import {
  setNarrationEnabled,
  setNarrationProvider,
} from "@/app/(private)/admin/ai/narration/actions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSettingRow } from "@/components/admin/admin-setting-row";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { AllowlistManager } from "@/components/admin/ai/narration/allowlist-manager";
import { AdminNarrationSync } from "@/components/admin/ai/narration/sync";
import { AdminNarrationCaps } from "@/components/admin/ai/narration/caps";
import type { NarrationSettings } from "@/lib/admin/narration/narration-settings";
import type { AdminNarrationAllowlistRow } from "@/lib/admin/narration/list-narration-allowlist";
import type {
  CollectionNarrationCoverage,
  NarrationSyncJobView,
} from "@/lib/narration/sync-shared";

type AdminNarrationPageClientProps = {
  healthNote: string | null;
  cronNote: { text: string; warning: boolean } | null;
  caps: NarrationSettings["caps"];
  usageLast24h: NarrationSettings["usageLast24h"];
  enabled: boolean;
  providers: NarrationSettings["providers"];
  providerKeys: NarrationSettings["providers"];
  allowlist: AdminNarrationAllowlistRow[];
  coverage: CollectionNarrationCoverage[];
  lastJob: NarrationSyncJobView | null;
};

export function AdminNarrationPageClient({
  healthNote,
  cronNote,
  caps,
  usageLast24h,
  enabled,
  providers,
  providerKeys,
  allowlist,
  coverage,
  lastJob,
}: AdminNarrationPageClientProps) {
  return (
    <>
      <AdminPageHeader
        title="Narration"
        description="Control narration for terms and stories, which providers make it, and who can use it. Narration is never charged in AI credits."
      />

      <AdminSettingRow
        title="Narration enabled"
        description="When off, no one can play narration regardless of the allowlist below."
        notes={
          <>
            {healthNote ? <p className="m-0 mt-1 text-sm text-warning">{healthNote}</p> : null}
            {cronNote ? (
              <p
                className={`m-0 mt-1 text-sm ${cronNote.warning ? "text-warning" : "text-base-content/65"}`}
              >
                {cronNote.text}
              </p>
            ) : null}
          </>
        }
        control={
          <AdminSwitch label="Enable narration" value={enabled} save={setNarrationEnabled} />
        }
      />

      <AdminSettingRow
        title="Murf"
        description="The main provider. Used first whenever it is on."
        notes={
          providerKeys.murf ? null : (
            <p className="m-0 mt-1 text-sm text-warning">Missing MURF_API_KEY, so it is skipped.</p>
          )
        }
        control={
          <AdminSwitch
            label="Enable Murf"
            value={providers.murf}
            save={(next) => setNarrationProvider("murf", next)}
          />
        }
      />
      <AdminSettingRow
        title="ElevenLabs"
        description="The fallback. Used when Murf is off, not set up or fails."
        notes={
          providerKeys.elevenlabs ? null : (
            <p className="m-0 mt-1 text-sm text-warning">
              Missing ELEVENLABS_API_KEY, so it is skipped.
            </p>
          )
        }
        control={
          <AdminSwitch
            label="Enable ElevenLabs"
            value={providers.elevenlabs}
            save={(next) => setNarrationProvider("elevenlabs", next)}
          />
        }
      />

      <AdminNarrationCaps caps={caps} usageLast24h={usageLast24h} />
      <AllowlistManager allowlist={allowlist} />
      <AdminNarrationSync enabled={enabled} coverage={coverage} lastJob={lastJob} />
    </>
  );
}
