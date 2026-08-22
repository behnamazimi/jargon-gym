import { getSessionUser } from "@/lib/auth/require-session";
import { fetchSharedDomainsBrowse } from "@/lib/jargon/browse";
import { SharedDomainsBrowse } from "@/components/jargon/shared-domains-browse";

export default async function BrowseSharedDomainsPage() {
  const { supabase, user } = await getSessionUser();

  if (!user) {
    return <p className="text-sm text-base-content/60">Log in to browse shared collections.</p>;
  }

  const initialPage = await fetchSharedDomainsBrowse(supabase, user.id);

  return <SharedDomainsBrowse initialPage={initialPage} />;
}
