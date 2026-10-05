import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSection } from "@/components/admin/admin-section";
import { IssueActions } from "@/components/admin/issues/issue-actions";
import { IssueDetail } from "@/components/admin/issues/issue-detail";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { ADMIN_ISSUE_KIND } from "@/lib/admin/issues/labels";
import { getIssue } from "@/lib/admin/issues/queries";
import { isUuid } from "@/lib/admin/list-params";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminIssuePage({ params }: PageProps) {
  const { supabase } = await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const issue = await getIssue(supabase, id);
  if (!issue) notFound();

  return (
    <>
      <AdminPageHeader
        title={ADMIN_ISSUE_KIND[issue.kind].label}
        description={`Sent by ${issue.reporterEmail ?? "a member"}`}
        actions={
          <Link href="/admin/issues" className="btn btn-sm btn-ghost">
            All issues
          </Link>
        }
      />
      <IssueDetail issue={issue} />
      <AdminSection id="issue-actions" title="Actions">
        <IssueActions id={issue.id} status={issue.status} />
      </AdminSection>
    </>
  );
}
