import { notFound } from "next/navigation";
import { AdminNarrationPageClient } from "@/components/jargon/admin/admin-narration-page";
import { describeCron, getCronStatus } from "@/lib/narration/worker-status";
import { featureHealth } from "@/lib/ai/health";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
import { listAllCollectionsForAdmin } from "@/lib/jargon/admin/list-all-collections";
import { listNarrationAllowlistForAdmin } from "@/lib/jargon/admin/list-narration-allowlist";
import { getNarrationSettingsForAdmin } from "@/lib/jargon/admin/narration-settings";
import {
  canResumeNarrationSync,
  getLastNarrationSyncJob,
  kickNarrationSyncWorker,
  listCollectionNarrationCoverage,
} from "@/lib/narration/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminNarrationPage() {
  const { supabase, user } = await getSessionUser();
  if (!user || !(await getUserIsAdmin(user.id))) {
    notFound();
  }

  const admin = createAdminClient();
  const [settings, allowlist, collections] = await Promise.all([
    getNarrationSettingsForAdmin(supabase),
    listNarrationAllowlistForAdmin(supabase),
    listAllCollectionsForAdmin(supabase),
  ]);

  let lastJob = null;
  try {
    lastJob = await getLastNarrationSyncJob(admin);
  } catch (err) {
    console.error("Failed to load narration sync job:", err);
  }

  const coverage = await listCollectionNarrationCoverage(
    admin,
    collections.map((collection) => ({ id: collection.id, name: collection.name })),
  );

  const resumable = canResumeNarrationSync(lastJob);
  if (resumable) {
    kickNarrationSyncWorker();
  }

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
