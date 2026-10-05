import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { IssuesTable } from "@/components/admin/issues/issues-table";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { issuesHref, parseIssueParams } from "@/lib/admin/issues/list-params";
import { countNewIssues, listIssues } from "@/lib/admin/issues/queries";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const TABS = [
  { tab: "open", label: "Open" },
  { tab: "done", label: "Done" },
  { tab: "wont_do", label: "Won't do" },
] as const;

const KINDS = [
  { kind: "all", label: "All" },
  { kind: "problem", label: "Problems" },
  { kind: "idea", label: "Ideas" },
] as const;

export default async function AdminIssuesPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdminPage();
  const params = parseIssueParams(await searchParams);
  const [newCount, { rows, total, page }] = await Promise.all([
    countNewIssues(supabase),
    listIssues(supabase, params),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Issues"
        description={`Problems and ideas people sent from the app. ${newCount} new.`}
      />

      <AdminSection id="issue-queue" title="Queue">
        <div className="flex flex-wrap gap-2">
          <AdminTabs
            label="Issue status"
            tabs={TABS.map((item) => ({
              href: issuesHref({ ...params, tab: item.tab, page: 1 }),
              label: item.label,
              active: params.tab === item.tab,
            }))}
          />
          <AdminTabs
            label="Issue kind"
            tabs={KINDS.map((item) => ({
              href: issuesHref({ ...params, kind: item.kind, page: 1 }),
              label: item.label,
              active: params.kind === item.kind,
            }))}
          />
        </div>
        <IssuesTable rows={rows} />
        <AdminPagination
          page={page}
          total={total}
          hrefFor={(next) => issuesHref({ ...params, page: next })}
        />
      </AdminSection>
    </>
  );
}
