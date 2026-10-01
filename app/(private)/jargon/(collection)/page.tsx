import { getJargonSetupData } from "@/app/(private)/jargon/(collection)/actions";
import { JargonPage } from "@/components/jargon/jargon-page";
import type { ImportedSummary } from "@/components/jargon/imported-banner";
import { EmptyCollection } from "@/components/jargon/empty-collection";
import { RequestsAvailable } from "@/components/requests/requests-availability";
import { RequestsSection } from "@/components/requests/requests-section";
import { PageCenter } from "@/components/page-container";
import { LinkButton } from "@/components/ui/button";
import { batchResultSchema } from "@/lib/jargon/import/commit-schema";
import { getSessionUser } from "@/lib/auth/require-session";
import { fetchMyRequests, loadRequestEntryFor } from "@/lib/requests/repository";
import { getStudyPhoneUserSettings } from "@/lib/streak/settings";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ domain?: string; added?: string }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadImportedSummary(
  batchId: string | undefined,
): Promise<ImportedSummary | undefined> {
  if (!batchId || !UUID.test(batchId)) return undefined;

  const supabase = await createClient();
  const { data } = await supabase
    .from("import_batches")
    .select("result")
    .eq("id", batchId)
    .maybeSingle();
  const parsed = batchResultSchema.safeParse(data?.result);
  if (!parsed.success) return undefined;

  return {
    domainId: parsed.data.domain_id,
    domainName: parsed.data.domain_name,
    created: parsed.data.created,
    updated: parsed.data.updated,
    skipped: parsed.data.skipped,
    unfinished: parsed.data.unfinished,
    relationshipsDropped: parsed.data.relationships_dropped,
  };
}

async function loadRequests() {
  const { supabase, user } = await getSessionUser();
  if (!user) return { requests: [], canRequest: false };
  try {
    const { timezone } = await getStudyPhoneUserSettings(user.id);
    const [requests, entry] = await Promise.all([
      fetchMyRequests(supabase, timezone),
      loadRequestEntryFor(supabase, user.id),
    ]);
    return { requests, canRequest: entry.state === "available" };
  } catch (error) {
    console.error("Couldn't load collection requests:", error);
    return { requests: [], canRequest: false };
  }
}

export default async function JargonListPage({ searchParams }: PageProps) {
  const { domain: selectedDomainId, added } = await searchParams;
  const [setup, importedSummary, { requests, canRequest }] = await Promise.all([
    getJargonSetupData(selectedDomainId),
    loadImportedSummary(added),
    loadRequests(),
  ]);

  if ("emptyCollection" in setup) {
    return <EmptyCollection requests={requests} />;
  }

  if ("error" in setup) {
    const showImportLink = "showImportLink" in setup;
    return (
      <PageCenter className={showImportLink ? "gap-3" : undefined}>
        <p className="text-sm text-base-content/60">{setup.error}</p>
        {showImportLink ? <LinkButton href="/jargon/import">Add your own terms</LinkButton> : null}
      </PageCenter>
    );
  }

  return (
    <RequestsAvailable available={canRequest}>
      <JargonPage
        initialData={setup.data}
        narrationAccess={setup.narrationAccess}
        importedSummary={importedSummary}
        topSlot={<RequestsSection requests={requests} />}
      />
    </RequestsAvailable>
  );
}
