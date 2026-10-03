import { cookies, headers } from "next/headers";
import { LibraryPage } from "@/components/library/library-page";
import type { ImportedSummary } from "@/components/import/imported-banner";
import { EmptyCollection } from "@/components/library/empty-collection";
import { NarrationAccess } from "@/components/library/narration-access";
import { RequestsAvailable } from "@/components/requests/requests-availability";
import { PageCenter } from "@/components/page-container";
import { LinkButton } from "@/components/ui/button";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { batchResultSchema } from "@/lib/import/commit-schema";
import { readLibraryFiltersCookie } from "@/lib/library/library-filters";
import { loadLibraryPage } from "@/lib/library/load";
import { LIBRARY_LAST_DOMAIN_COOKIE } from "@/lib/library/pick-domain";
import { LOAD_FAILED_MESSAGE } from "@/lib/library/setup";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { loadRequestEntryFor } from "@/lib/requests/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

type PageProps = {
  searchParams: Promise<{ domain?: string; added?: string }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadImportedSummary(
  supabase: Client,
  batchId: string | undefined,
): Promise<ImportedSummary | undefined> {
  if (!batchId || !UUID.test(batchId)) return undefined;

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

async function loadCanRequest(supabase: Client, userId: string) {
  try {
    const entry = await loadRequestEntryFor(supabase, userId);
    return entry.state === "available";
  } catch (error) {
    console.error("Couldn't load collection requests:", error);
    return false;
  }
}

function LoadError({ message }: { message: string }) {
  return (
    <PageCenter className="gap-3">
      <p className="text-sm text-base-content/70">{message}</p>
      <LinkButton href="/jargon/import">Add your own terms</LinkButton>
    </PageCenter>
  );
}

export default async function JargonListPage({ searchParams }: PageProps) {
  const [{ domain: requestedDomainId, added }, cookieStore, requestHeaders, auth] =
    await Promise.all([searchParams, cookies(), headers(), requireAuthenticatedClient()]);

  if ("error" in auth) {
    return (
      <PageCenter>
        <p className="text-sm text-base-content/70">Log in to view your collection.</p>
      </PageCenter>
    );
  }
  const { supabase, user } = auth;

  // Not awaited: each is read where it's shown, so none of them holds up the list.
  const importedSummary = loadImportedSummary(supabase, added);
  const canRequest = loadCanRequest(supabase, user.id);
  const narrationAccess = getNarrationAccessForUser(createAdminClient(), user.id);

  let result;
  try {
    result = await loadLibraryPage(supabase, user.id, {
      requestedDomainId,
      lastDomainId: cookieStore.get(LIBRARY_LAST_DOMAIN_COOKIE)?.value,
    });
  } catch (error) {
    console.error("Couldn't load the Library:", error);
    return <LoadError message={LOAD_FAILED_MESSAGE} />;
  }

  if (result.kind === "empty") return <EmptyCollection />;

  return (
    <RequestsAvailable available={canRequest}>
      <NarrationAccess access={narrationAccess}>
        <LibraryPage
          data={result.data}
          filtersCookie={readLibraryFiltersCookie(requestHeaders.get("cookie") ?? "")}
          importedSummary={importedSummary}
        />
      </NarrationAccess>
    </RequestsAvailable>
  );
}
