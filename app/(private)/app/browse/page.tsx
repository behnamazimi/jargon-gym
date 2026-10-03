import { getBrowseSetupData } from "@/app/(private)/app/browse/actions";
import { SharedDomainsBrowse } from "@/components/library/shared-domains-browse";
import { getSessionUser } from "@/lib/auth/require-session";
import { loadRequestEntryFor } from "@/lib/requests/repository";

export default async function BrowseSharedDomainsPage() {
  const { supabase, user } = await getSessionUser();
  const [setup, requestEntry] = await Promise.all([
    getBrowseSetupData(),
    user ? loadRequestEntryFor(supabase, user.id) : Promise.resolve({ state: "closed" as const }),
  ]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }

  return <SharedDomainsBrowse initialPage={setup.initialPage} requestEntry={requestEntry} />;
}
