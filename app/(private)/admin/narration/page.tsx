import { AdminNarrationPageClient } from "@/components/jargon/admin/admin-narration-page";
import { describeCron, getCronStatus } from "@/lib/narration/worker-status";
import { featureHealth } from "@/lib/ai/health";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { listAllCollectionsForAdmin } from "@/lib/jargon/admin/list-all-collections";
import { listNarrationAllowlistForAdmin } from "@/lib/jargon/admin/list-narration-allowlist";
import { getNarrationSettingsForAdmin } from "@/lib/jargon/admin/narration-settings";
import {
  canResumeNarrationSync,
  getLastNarrationSyncJob,
  listCollectionNarrationCoverage,
} from "@/lib/narration/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminNarrationPage() {
  const { supabase, user } = await requireAdminPage();

  const admin = createAdminClient();
  const [settings, allowlist, collections] = await Promise.all([
    getNarrationSettingsForAdmin(supabase),
    listNarrationAllowlistForAdmin(supabase),
    listAllCollectionsForAdmin(supabase, user.id),
  ]);

  let lastJob = null;
  try {
    lastJob = await getLastNarrationSyncJob(admin);
  } catch (err) {
    console.error("Failed to load narration sync job:", err);
  }

  const coverage = await listCollectionNarrationCoverage(
    admin,
    collections
      .filter((collection) => !collection.readOnly)
      .map((collection) => ({ id: collection.id, name: collection.name })),
  );

  const resumable = canResumeNarrationSync(lastJob);

  const jobNeedsCron = resumable || lastJob?.status === "queued" || lastJob?.status === "running";
  const cronNote = describeCron(await getCronStatus(supabase), jobNeedsCron);

  const health = featureHealth("narration_term");

  return (
    <AdminNarrationPageClient
      healthNote={health.ok ? null : health.note}
      cronNote={cronNote}
      enabled={settings.enabled}
      caps={settings.caps}
      usageLast24h={settings.usageLast24h}
      allowlist={allowlist}
      coverage={coverage}
      lastJob={lastJob}
    />
  );
}
