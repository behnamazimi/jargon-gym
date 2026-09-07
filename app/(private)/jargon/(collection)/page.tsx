import { getJargonSetupData } from "@/app/(private)/jargon/(collection)/actions";
import { JargonPage } from "@/components/jargon/jargon-page";
import { EmptyCollection } from "@/components/jargon/empty-collection";
import { PageCenter } from "@/components/page-container";
import { LinkButton } from "@/components/ui/button";

type PageProps = {
  searchParams: Promise<{ domain?: string }>;
};

export default async function JargonListPage({ searchParams }: PageProps) {
  const { domain: selectedDomainId } = await searchParams;
  const setup = await getJargonSetupData(selectedDomainId);

  if ("emptyCollection" in setup) {
    return <EmptyCollection />;
  }

  if ("error" in setup) {
    return (
      <PageCenter className={setup.showImportLink ? "gap-3" : undefined}>
        <p className="text-sm text-base-content/60">{setup.error}</p>
        {setup.showImportLink ? <LinkButton href="/jargon/import">Import jargon</LinkButton> : null}
      </PageCenter>
    );
  }

  return <JargonPage initialData={setup.data} narrationAccess={setup.narrationAccess} />;
}
