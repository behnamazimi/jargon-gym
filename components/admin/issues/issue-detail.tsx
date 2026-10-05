import Link from "next/link";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminIssue } from "@/lib/admin/issues/queries";
import { ADMIN_ISSUE_STATUS } from "@/lib/admin/issues/labels";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium tracking-wide text-base-content/50 uppercase">{label}</dt>
      <dd className="m-0 text-sm break-words text-base-content">{children}</dd>
    </div>
  );
}

export function IssueDetail({ issue }: { issue: AdminIssue }) {
  const status = ADMIN_ISSUE_STATUS[issue.status];
  const screenshotUrl = `/api/admin/issues/${issue.id}/screenshot`;

  return (
    <div className="flex flex-col gap-4">
      <span className={`badge w-fit ${status.badge}`}>{status.label}</span>
      <p className="m-0 rounded-lg border border-base-300 p-4 text-sm whitespace-pre-line break-words">
        {issue.body}
      </p>
      {issue.hasScreenshot ? (
        <a href={screenshotUrl} target="_blank" rel="noreferrer" className="w-fit">
          {/* oxlint-disable-next-line nextjs/no-img-element -- served by an admin-only route */}
          <img
            src={screenshotUrl}
            alt="Screenshot sent with this issue"
            className="max-h-[32rem] rounded-lg border border-base-300 object-contain"
          />
        </a>
      ) : null}
      <dl className="m-0 grid gap-4 rounded-lg border border-base-300 p-4 sm:grid-cols-2">
        <Fact label="From">
          {issue.reporterEmail ? (
            <Link href={`/admin/people/${issue.userId}`} className="link link-hover">
              {issue.reporterEmail}
            </Link>
          ) : (
            "—"
          )}
        </Fact>
        <Fact label="Sent">{formatAdminDateTime(issue.createdAt)}</Fact>
        <Fact label="Page">
          <span className="font-mono text-xs">{issue.pagePath ?? "—"}</span>
        </Fact>
        <Fact label="Window">{issue.viewport ?? "—"}</Fact>
        <div className="sm:col-span-2">
          <Fact label="Browser">
            <span className="font-mono text-xs">{issue.userAgent ?? "—"}</span>
          </Fact>
        </div>
        {issue.statusChangedAt ? (
          <Fact label="Status changed">{formatAdminDateTime(issue.statusChangedAt)}</Fact>
        ) : null}
      </dl>
    </div>
  );
}
