import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSearchBar } from "@/components/admin/admin-search-bar";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { RequestsSettings } from "@/components/admin/requests/requests-settings";
import { RequestsTable } from "@/components/admin/requests/requests-table";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { parseRequestParams, requestsHref } from "@/lib/admin/requests/list-params";
import { listRequests, readRequestSettings } from "@/lib/admin/requests/queries";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TABS = [
  { tab: "open", label: "Open" },
  { tab: "needs_input", label: "Waiting for a reply" },
  { tab: "done", label: "Done" },
] as const;

export default async function AdminRequestsPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdminPage();
  const params = parseRequestParams(await searchParams);
  const [settings, { rows, total, page }] = await Promise.all([
    readRequestSettings(supabase),
    listRequests(supabase, params),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Requests"
        description="Collections people asked for. Open one to accept it, ask a question, or deliver it."
      />

      <AdminSection id="request-settings" title="Settings">
        <RequestsSettings settings={settings} />
      </AdminSection>

      <AdminSection id="request-queue" title="Queue">
        <AdminTabs
          label="Request status"
          tabs={TABS.map((item) => ({
            href: requestsHref({ ...params, tab: item.tab, page: 1 }),
            label: item.label,
            active: params.tab === item.tab,
          }))}
        />
        <AdminSearchBar
          action="/admin/requests"
          query={params.q}
          label="Search by topic"
          hidden={{ tab: params.tab }}
        />
        <RequestsTable rows={rows} />
        <AdminPagination
          page={page}
          total={total}
          hrefFor={(next) => requestsHref({ ...params, page: next })}
        />
      </AdminSection>
    </>
  );
}
