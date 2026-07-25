import { createClient } from "@/lib/supabase/server";
import { JargonDataError, loadJargonPageData } from "@/lib/jargon/load-jargon-page-data";
import { fetchDomainIdForTerm } from "@/lib/jargon/terms";
import { JargonPage } from "@/components/jargon/jargon-page";
import { EmptyCollection } from "@/components/jargon/empty-collection";
import Link from "next/link";

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
      <div className="flex min-h-full items-center justify-center bg-background px-4 py-12 text-foreground">
        <p className="text-sm text-muted-foreground">You must be logged in to view jargon.</p>
      </div>
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
    if (err instanceof JargonDataError && err.message.includes("No jargon domains")) {
      return <EmptyCollection />;
    }

    const message =
      err instanceof JargonDataError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Something went wrong while loading jargon terms.";

    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-background px-4 py-12 text-foreground">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link
          href="/jargon/import"
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Import jargon
        </Link>
      </div>
    );
  }
}
