import Link from "next/link";
import { formatAdminDate } from "@/lib/admin/format";
import { ADMIN_STATUS, describeRequestShape } from "@/lib/admin/requests/labels";
import type { AdminRequest } from "@/lib/admin/requests/queries";

export function RequestsTable({ rows }: { rows: AdminRequest[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="table">
        <thead>
          <tr>
            <th>Topic</th>
            <th>Kind</th>
            <th>Asked</th>
            <th>Due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = ADMIN_STATUS[row.status] ?? { label: row.status, badge: "badge-ghost" };
            return (
              <tr key={row.id}>
                <td className="max-w-72 font-medium text-base-content">
                  <Link href={`/admin/requests/${row.id}`} className="link link-hover break-words">
                    {row.topic}
                  </Link>
                </td>
                <td className="text-base-content/65">{describeRequestShape(row)}</td>
                <td className="text-base-content/65">{formatAdminDate(row.createdAt)}</td>
                <td className="whitespace-nowrap text-base-content/65">
                  {formatAdminDate(row.dueAt)}
                  {row.overdue ? (
                    <span className="badge badge-warning badge-soft ml-2">Overdue</span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap">
                  <span className={`badge ${status.badge}`}>{status.label}</span>
                  {row.repliedAt && ["requested", "in_progress"].includes(row.status) ? (
                    <span className="badge badge-info badge-soft ml-2">Reply received</span>
                  ) : null}
                  {row.emailFailed ? (
                    <span className="badge badge-error badge-soft ml-2">Email failed</span>
                  ) : null}
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
