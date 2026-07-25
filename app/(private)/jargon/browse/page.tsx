import { createClient } from "@/lib/supabase/server";
import { fetchSharedDomainsBrowse } from "@/lib/jargon/queries";
import { SharedDomainsBrowse } from "@/components/jargon/shared-domains-browse";

export default async function BrowseSharedDomainsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background px-4 py-12 text-foreground">
        <p className="text-sm text-muted">You must be logged in.</p>
      </div>
    );
  }

  const domains = await fetchSharedDomainsBrowse(supabase, user.id);

  return (
    <div className="min-h-full bg-background text-foreground">
      <SharedDomainsBrowse domains={domains} />
    </div>
  );
}
