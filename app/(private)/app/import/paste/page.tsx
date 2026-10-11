import { getImportSetupData } from "@/app/(private)/app/import/actions";
import { ImportFlow } from "@/components/import/import-flow";
import { PageBadge } from "@/components/illustrations/scenes/page-badge";
import { PageHeader } from "@/components/shared/page-header";
import { withDirection } from "@/components/shared/view-transitions";

type PageProps = {
  searchParams: Promise<{ to?: string; from?: string }>;
};

async function PasteListPage({ searchParams }: PageProps) {
  const { to, from } = await searchParams;
  const setup = await getImportSetupData();

  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }

  const preset = setup.collections.some((collection) => collection.id === to) ? to : undefined;

  return (
    <>
      <PageHeader
        badge={<PageBadge page="paste" />}
        title="Paste a list"
        backHref={preset ? `/app/library?collection=${preset}` : "/app/import"}
        backLabel={preset ? "Back to collection" : "Add a collection"}
        compactOnPhone
      />
      <ImportFlow
        collections={setup.collections}
        addedNames={setup.addedNames}
        presetCollectionId={preset}
        entry={preset ? "collection" : "chooser"}
        autoCheck={from === "term"}
      />
    </>
  );
}

export default withDirection(PasteListPage);
