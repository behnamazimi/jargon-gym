import { getBrowseSetupData } from "@/app/(private)/app/browse/actions";
import { SharedCollectionsBrowse } from "@/components/library/shared-collections-browse";
import { getSessionUser } from "@/lib/auth/require-session";
import { parseBrowseGroup } from "@/lib/library/browse";
import { loadRequestEntryFor } from "@/lib/requests/repository";

export default async function BrowseSharedCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const group = parseBrowseGroup((await searchParams).tab);
  const { supabase, user } = await getSessionUser();
  const [setup, requestEntry] = await Promise.all([
    getBrowseSetupData(group),
    user ? loadRequestEntryFor(supabase, user.id) : Promise.resolve({ state: "closed" as const }),
  ]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }

  return (
    <SharedCollectionsBrowse
      key={group}
      initialPage={setup.initialPage}
      initialGroup={group}
      requestEntry={requestEntry}
    />
  );
}
