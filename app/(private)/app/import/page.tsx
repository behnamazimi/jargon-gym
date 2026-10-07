import { FolderPlus } from "lucide-react";
import { getImportSetupData } from "@/app/(private)/app/import/actions";
import { ImportChooser } from "@/components/import/import-chooser";
import { PageHeader } from "@/components/shared/page-header";
import { RequestsSection } from "@/components/requests/requests-section";
import { getSessionUser } from "@/lib/auth/require-session";
import { fetchMyRequests, loadRequestEntryFor } from "@/lib/requests/repository";
import { getStudyPhoneUserSettings } from "@/lib/streak/settings";

async function loadRequests() {
  const { supabase, user } = await getSessionUser();
  if (!user) return { requests: [], requestEntry: { state: "closed" as const } };
  try {
    const { timezone } = await getStudyPhoneUserSettings(user.id);
    const [requests, requestEntry] = await Promise.all([
      fetchMyRequests(supabase, timezone),
      loadRequestEntryFor(supabase, user.id),
    ]);
    return { requests, requestEntry };
  } catch (error) {
    console.error("Couldn't load collection requests:", error);
    return { requests: [], requestEntry: { state: "closed" as const } };
  }
}

export default async function ImportPage() {
  const [setup, { requests, requestEntry }] = await Promise.all([
    getImportSetupData(),
    loadRequests(),
  ]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }

  return (
    <>
      <PageHeader
        icon={FolderPlus}
        title="Add a collection"
        description="Find a collection, or start from what you have."
        compactOnPhone
      />
      <RequestsSection requests={requests} />
      <ImportChooser collections={setup.collections} requestEntry={requestEntry} />
    </>
  );
}
