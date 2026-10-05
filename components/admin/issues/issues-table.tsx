import Link from "next/link";
import { formatAdminDate } from "@/lib/admin/format";
import type { AdminIssue } from "@/lib/admin/issues/queries";
import { ADMIN_ISSUE_KIND } from "@/lib/admin/issues/labels";

export function IssuesTable({ rows }: { rows: AdminIssue[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="table">
        <thead>
          <tr>
            <th>Issue</th>
            <th>Kind</th>
            <th>Page</th>
            <th>From</th>
            <th>Sent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const kind = ADMIN_ISSUE_KIND[row.kind];
            return (
              <tr key={row.id}>
                <td className="max-w-96">
                  <Link
                    href={`/admin/issues/${row.id}`}
                    className="link link-hover line-clamp-2 break-words font-medium text-base-content"
                  >
                    {row.body}
                  </Link>
                </td>
                <td className="whitespace-nowrap">
                  <span className={`badge ${kind.badge}`}>{kind.label}</span>
                  {row.hasScreenshot ? (
                    <span className="badge badge-ghost ml-2">Screenshot</span>
                  ) : null}
                </td>
                <td className="max-w-48 truncate font-mono text-xs text-base-content/65">
                  {row.pagePath ?? "—"}
                </td>
                <td className="max-w-48 truncate text-base-content/65">
                  {row.reporterEmail ?? "—"}
                </td>
                <td className="whitespace-nowrap text-base-content/65">
                  {formatAdminDate(row.createdAt)}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-base-content/50">
                Nothing here.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
