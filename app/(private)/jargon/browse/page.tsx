import { createClient } from "@/lib/supabase/server";
import { fetchSharedDomainsBrowse } from "@/lib/jargon/browse";
import { SharedDomainsBrowse } from "@/components/jargon/shared-domains-browse";

export default async function BrowseSharedDomainsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-sm text-base-content/60">Log in to browse shared collections.</p>
      </div>
    );
  }

  const domains = await fetchSharedDomainsBrowse(supabase, user.id);

  return <SharedDomainsBrowse domains={domains} />;
}
