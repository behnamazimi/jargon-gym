import { JargonDataError, loadJargonPageData } from "@/lib/jargon/load-jargon-page-data";
import { JargonPage } from "@/components/jargon/jargon-page";
import { EmptyCollection } from "@/components/jargon/empty-collection";
import { PageCenter } from "@/components/page-container";
import { LinkButton } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/require-session";
import { getNarrationAccessForUser } from "@/lib/narration/access";

type PageProps = {
  searchParams: Promise<{ domain?: string }>;
};

export default async function JargonListPage({ searchParams }: PageProps) {
  const [{ user, supabase }, { domain: selectedDomainId }] = await Promise.all([
    getSessionUser(),
    searchParams,
  ]);

  if (!user) {
    return (
      <PageCenter>
        <p className="text-sm text-base-content/60">Log in to view your collection.</p>
      </PageCenter>
    );
  }

  try {
    const [data, narrationAccess] = await Promise.all([
      loadJargonPageData(supabase, {
        userId: user.id,
        selectedDomainId,
      }),
      getNarrationAccessForUser(supabase, user.id),
    ]);
    return <JargonPage initialData={data} narrationAccess={narrationAccess} />;
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
