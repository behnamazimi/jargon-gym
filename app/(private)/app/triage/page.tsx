import { Layers } from "lucide-react";
import { redirect } from "next/navigation";
import { getLibrarySetupData } from "@/lib/library/setup";
import { PageHeader } from "@/components/shared/page-header";
import { TriagePage } from "@/components/triage/triage-page";
import { createClient } from "@/lib/supabase/server";
import { fetchNotYetTermIds } from "@/lib/triage/repository";

type PageProps = {
  searchParams: Promise<{ collection?: string }>;
};

export default async function TriageRoute({ searchParams }: PageProps) {
  const { collection: selectedCollectionId } = await searchParams;
  const setup = await getLibrarySetupData(selectedCollectionId);

  if ("emptyCollection" in setup) redirect("/app/library");
  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }

  const { data, narrationAccess } = setup;
  const notYetTermIds = await fetchNotYetTermIds(await createClient(), data.collection.id);

  return (
    <>
      <PageHeader
        icon={Layers}
        title="Triage"
        description="Go through terms and mark the ones you already know."
        backHref={`/app/library?collection=${data.collection.id}`}
        compactOnPhone
      />
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-3 lg:max-w-2xl">
        <TriagePage
          key={data.collection.id}
          collection={data.collection}
          collections={data.collections}
          terms={data.terms}
          knownTermIds={data.knownTermIds}
          markedKnownTermIds={data.markedKnownTermIds}
          notYetTermIds={notYetTermIds}
          narrationAccess={narrationAccess}
        />
      </div>
    </>
  );
}
