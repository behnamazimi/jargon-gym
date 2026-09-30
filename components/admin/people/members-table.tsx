import Link from "next/link";
import { formatAdminDate } from "@/lib/admin/format";
import type { AdminMemberRow } from "@/lib/admin/people/members";

export function MembersTable({
  rows,
  hrefFor,
}: {
  rows: AdminMemberRow[];
  hrefFor: (id: string) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="font-medium text-base-content">
                <Link href={hrefFor(row.id)} className="link link-hover">
                  {row.email}
                </Link>
              </td>
              <td>
                <span className={`badge ${row.role === "admin" ? "badge-primary" : "badge-ghost"}`}>
                  {row.role}
                </span>
                {row.suspended ? <span className="badge badge-error ml-2">suspended</span> : null}
              </td>
              <td className="text-base-content/65">{formatAdminDate(row.createdAt)}</td>
              <td className="text-right">
                <Link href={hrefFor(row.id)} className="btn btn-sm btn-ghost">
                  Manage
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center text-base-content/50">
                No one matches.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
