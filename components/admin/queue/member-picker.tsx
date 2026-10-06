import Link from "next/link";
import { AdminSearchBar } from "@/components/admin/admin-search-bar";
import type { AdminMemberRow } from "@/lib/admin/people/members";
import { queueHref } from "@/lib/admin/queue-debug/params";

export function MemberPicker({ query, rows }: { query: string; rows: AdminMemberRow[] }) {
  return (
    <>
      <AdminSearchBar
        action="/admin/system/queue"
        query={query}
        label="Search a member by email"
        hidden={{}}
      />
      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="font-medium text-base-content">{row.email}</td>
                <td className="text-right">
                  <Link href={queueHref({ userId: row.id })} className="btn btn-sm btn-ghost">
                    View queue
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-center text-base-content/50">
                  No one matches.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
