import { FolderPlus } from "lucide-react";
import { getImportSetupData } from "@/app/(private)/jargon/import/actions";
import { ImportChooser } from "@/components/jargon/import/import-chooser";
import { PageHeader } from "@/components/jargon/page-header";

export default async function ImportPage() {
  const setup = await getImportSetupData();

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
      <ImportChooser collections={setup.collections} />
    </>
  );
}
