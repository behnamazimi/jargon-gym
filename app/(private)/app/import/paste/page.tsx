import { ClipboardPaste } from "lucide-react";
import { getImportSetupData } from "@/app/(private)/app/import/actions";
import { ImportFlow } from "@/components/import/import-flow";
import { PageHeader } from "@/components/shared/page-header";

type PageProps = {
  searchParams: Promise<{ to?: string; from?: string }>;
};

export default async function PasteListPage({ searchParams }: PageProps) {
  const { to, from } = await searchParams;
  const setup = await getImportSetupData();

  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }

  const preset = setup.collections.some((collection) => collection.id === to) ? to : undefined;

  return (
    <>
      <PageHeader
        icon={ClipboardPaste}
        title="Paste a list"
        backHref={preset ? `/app/library?domain=${preset}` : "/app/import"}
        backLabel={preset ? "Back to collection" : "Add a collection"}
        compactOnPhone
      />
      <ImportFlow
        collections={setup.collections}
        addedNames={setup.addedNames}
        presetDomainId={preset}
        entry={preset ? "collection" : "chooser"}
        autoCheck={from === "term"}
      />
    </>
  );
}
