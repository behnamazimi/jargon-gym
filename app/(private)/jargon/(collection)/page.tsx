import { getJargonSetupData } from "@/app/(private)/jargon/(collection)/actions";
import { JargonPage } from "@/components/jargon/jargon-page";
import { EmptyCollection } from "@/components/jargon/empty-collection";
import { PageCenter } from "@/components/page-container";
import { LinkButton } from "@/components/ui/button";

type PageProps = {
  searchParams: Promise<{ domain?: string; imported?: string }>;
};

export default async function JargonListPage({ searchParams }: PageProps) {
  const { domain: selectedDomainId, imported } = await searchParams;
  const importedCount = imported === undefined ? undefined : Number.parseInt(imported, 10);
  const setup = await getJargonSetupData(selectedDomainId);

  if ("emptyCollection" in setup) {
    return <EmptyCollection />;
  }

  if ("error" in setup) {
    const showImportLink = "showImportLink" in setup;
    return (
      <PageCenter className={showImportLink ? "gap-3" : undefined}>
        <p className="text-sm text-base-content/60">{setup.error}</p>
        {showImportLink ? <LinkButton href="/jargon/import">Add your own terms</LinkButton> : null}
      </PageCenter>
    );
  }

  return (
    <JargonPage
      initialData={setup.data}
      narrationAccess={setup.narrationAccess}
      importedCount={
        importedCount !== undefined && Number.isInteger(importedCount) && importedCount >= 0
          ? importedCount
          : undefined
      }
    />
  );
}
