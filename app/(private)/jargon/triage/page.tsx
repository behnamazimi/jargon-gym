import { Layers } from "lucide-react";
import { redirect } from "next/navigation";
import { getJargonSetupData } from "@/lib/jargon/library/setup";
import { PageHeader } from "@/components/jargon/page-header";
import { TriagePage } from "@/components/jargon/triage/triage-page";
import { createClient } from "@/lib/supabase/server";
import { fetchNotYetTermIds } from "@/lib/triage/repository";

type PageProps = {
  searchParams: Promise<{ domain?: string }>;
};

export default async function JargonTriagePage({ searchParams }: PageProps) {
  const { domain: selectedDomainId } = await searchParams;
  const setup = await getJargonSetupData(selectedDomainId);

  if ("emptyCollection" in setup) redirect("/jargon");
  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  const { data, narrationAccess } = setup;
  const notYetTermIds = await fetchNotYetTermIds(await createClient(), data.domain.id);

  return (
    <>
      <PageHeader
        icon={Layers}
        title="Triage"
        description="Swipe through terms and mark the ones you already know."
        backHref={`/jargon?domain=${data.domain.id}`}
        compactOnPhone
      />
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-3 lg:max-w-2xl">
        <TriagePage
          key={data.domain.id}
          domain={data.domain}
          domains={data.domains}
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
