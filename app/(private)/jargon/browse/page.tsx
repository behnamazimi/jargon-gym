import { getBrowseSetupData } from "@/app/(private)/jargon/browse/actions";
import { SharedDomainsBrowse } from "@/components/jargon/shared-domains-browse";

export default async function BrowseSharedDomainsPage() {
  const setup = await getBrowseSetupData();

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  return <SharedDomainsBrowse initialPage={setup.initialPage} />;
}
