import { createClient } from "@/lib/supabase/server";
import { JargonDataError, loadJargonPageData } from "@/lib/jargon/load-jargon-page-data";
import { fetchDomainIdForTerm } from "@/lib/jargon/terms";
import { JargonPage } from "@/components/jargon/jargon-page";
import { EmptyCollection } from "@/components/jargon/empty-collection";
import { PageCenter } from "@/components/page-container";
import { LinkButton } from "@/components/ui/button";

type PageProps = {
  searchParams: Promise<{ domain?: string; termId?: string }>;
};

export default async function JargonListPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <PageCenter>
        <p className="text-sm text-base-content/60">Log in to view your collection.</p>
      </PageCenter>
    );
  }

  const { domain: domainParam, termId } = await searchParams;
  let selectedDomainId = domainParam;

  if (termId && !selectedDomainId) {
    selectedDomainId = (await fetchDomainIdForTerm(supabase, termId)) ?? undefined;
  }

  try {
    const data = await loadJargonPageData(supabase, {
      userId: user.id,
      selectedDomainId,
    });
    return <JargonPage initialData={data} initialTermId={termId} />;
  } catch (err) {
    if (err instanceof JargonDataError && err.message.includes("don't have any collections")) {
      return <EmptyCollection />;
    }

    const message =
      err instanceof JargonDataError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Couldn't load your collection. Refresh the page or try again.";

    return (
      <PageCenter className="gap-3">
        <p className="text-sm text-base-content/60">{message}</p>
        <LinkButton href="/jargon/import">Import jargon</LinkButton>
      </PageCenter>
    );
  }
}
