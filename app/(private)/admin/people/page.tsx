import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSearchBar } from "@/components/admin/admin-search-bar";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { MembersTable } from "@/components/admin/people/members-table";
import { WaitlistTable } from "@/components/admin/people/waitlist-table";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { parsePeopleParams, peopleHref, type PeopleParams } from "@/lib/admin/list-params";
import { listMembers } from "@/lib/admin/people/members";
import { listWaitlist } from "@/lib/admin/people/waitlist";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const STATUS_TABS = [
  { status: "pending", label: "Pending" },
  { status: "invited", label: "Invited" },
  { status: "all", label: "All" },
] as const;

async function WaitlistView({
  supabase,
  params,
}: {
  supabase: Awaited<ReturnType<typeof requireAdminPage>>["supabase"];
  params: PeopleParams;
}) {
  const { rows, total, page } = await listWaitlist(supabase, params);
  return (
    <>
      <AdminTabs
        label="Waitlist status"
        tabs={STATUS_TABS.map((tab) => ({
          href: peopleHref({ ...params, status: tab.status, page: 1 }),
          label: tab.label,
          active: params.status === tab.status,
        }))}
      />
      <AdminSearchBar
        action="/admin/people"
        query={params.q}
        label="Search by email"
        hidden={{ view: "waitlist", status: params.status }}
      />
      <WaitlistTable key={`${params.status}:${params.q}:${params.page}`} rows={rows} />
      <AdminPagination
        page={page}
        total={total}
        hrefFor={(next) => peopleHref({ ...params, page: next })}
      />
    </>
  );
}

async function MembersView({
  supabase,
  params,
}: {
  supabase: Awaited<ReturnType<typeof requireAdminPage>>["supabase"];
  params: PeopleParams;
}) {
  const { rows, total, page } = await listMembers(supabase, params);
  return (
    <>
      <AdminSearchBar
        action="/admin/people"
        query={params.q}
        label="Search by email"
        hidden={{ view: "members" }}
      />
      <MembersTable rows={rows} hrefFor={(id) => `/admin/people/${id}`} />
      <AdminPagination
        page={page}
        total={total}
        hrefFor={(next) => peopleHref({ ...params, page: next })}
      />
    </>
  );
}

export default async function AdminPeoplePage({ searchParams }: PageProps) {
  const { supabase } = await requireAdminPage();
  const params = parsePeopleParams(await searchParams);

  return (
    <>
      <AdminPageHeader
        title="People"
        description="Approve waitlist requests, and open a member to manage their account."
      />
      <AdminTabs
        label="People"
        tabs={[
          {
            href: peopleHref({ view: "waitlist" }),
            label: "Waitlist",
            active: params.view === "waitlist",
          },
          {
            href: peopleHref({ view: "members" }),
            label: "Members",
            active: params.view === "members",
          },
        ]}
      />
      {params.view === "members" ? (
        <MembersView supabase={supabase} params={params} />
      ) : (
        <WaitlistView supabase={supabase} params={params} />
      )}
    </>
  );
}
