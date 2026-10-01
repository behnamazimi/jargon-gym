import { FolderPlus } from "lucide-react";
import { getImportSetupData } from "@/app/(private)/jargon/import/actions";
import { ImportChooser } from "@/components/jargon/import/import-chooser";
import { PageHeader } from "@/components/jargon/page-header";
import { getSessionUser } from "@/lib/auth/require-session";
import { loadRequestEntryFor } from "@/lib/requests/repository";

export default async function ImportPage() {
  const { supabase, user } = await getSessionUser();
  const [setup, requestEntry] = await Promise.all([
    getImportSetupData(),
    user ? loadRequestEntryFor(supabase, user.id) : Promise.resolve({ state: "closed" as const }),
  ]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  return (
    <>
      <PageHeader
        icon={FolderPlus}
        title="Add a collection"
        description="Find a shared collection, or start from what you have."
        compactOnPhone
      />
      <ImportChooser collections={setup.collections} requestEntry={requestEntry} />
    </>
  );
}
