import { notFound } from "next/navigation";
import { AdminNarrationPageClient } from "@/components/jargon/admin/admin-narration-page";
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
  const [coverage, lastJob] = await Promise.all([
    listCollectionNarrationCoverage(
      admin,
      collections.map((collection) => ({ id: collection.id, name: collection.name })),
    ),
    getLastNarrationSyncJob(admin),
  ]);

  if (canResumeNarrationSync(lastJob)) {
    kickNarrationSyncWorker();
  }

  return (
    <AdminNarrationPageClient
      enabled={settings.enabled}
      allowlist={allowlist}
      coverage={coverage}
      lastJob={lastJob}
    />
  );
}
