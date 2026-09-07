import { getImportSetupData } from "@/app/(private)/jargon/import/actions";
import { ImportPageClient } from "@/components/jargon/import/import-page";

export default async function ImportPage() {
  const setup = await getImportSetupData();

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  return <ImportPageClient collections={setup.collections} />;
}
