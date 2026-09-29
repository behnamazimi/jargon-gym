import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { auditHref, parseAuditParams } from "@/lib/admin/audit-params";
import { describeAudit, KNOWN_AUDIT_ACTIONS } from "@/lib/admin/audit-labels";
import { emailsForTargets, listAudit } from "@/lib/admin/audit-query";
import { formatAdminDateTime } from "@/lib/admin/format";
import { requireAdminPage } from "@/lib/admin/page-guard";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdminPage();
  const params = parseAuditParams(await searchParams);

  const { rows, total, page } = await listAudit(supabase, params);
  // Names are a courtesy: if they can't be read, the ids still show.
  const emails = await emailsForTargets(supabase, rows).catch((error: unknown) => {
    console.error("Couldn't read emails for the audit log:", error);
    return new Map<string, string>();
  });

  return (
    <>
      <AdminPageHeader
        title="Audit log"
        description="What admins changed, and when. Times are UTC. A change and its entry are saved separately, so an entry can be missing if saving it failed."
      />
      <form action="/admin/system/audit" method="get" className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span>Action</span>
          <select name="action" defaultValue={params.action ?? ""} className="select select-sm">
            <option value="">All</option>
            {KNOWN_AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {describeAudit(action, {}).label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-sm">
          Filter
        </button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>What</th>
              <th>About</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { label, summary } = describeAudit(row.action, row.details);
              const about = row.targetId
                ? (emails.get(row.targetId) ??
                  `${row.targetType ?? ""} ${row.targetId.slice(0, 8)}`.trim())
                : "—";
              return (
                <tr key={row.id}>
                  <td className="whitespace-nowrap text-base-content/65">
                    {formatAdminDateTime(row.createdAt)}
                  </td>
                  <td>
                    {row.actorEmail ?? (
                      <span className="text-base-content/50">Deleted account</span>
                    )}
                  </td>
                  <td>
                    <p className="m-0 font-medium text-base-content">{label}</p>
                    {summary ? <p className="m-0 text-sm text-base-content/65">{summary}</p> : null}
                  </td>
                  <td className="text-base-content/65">{about}</td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-base-content/50">
                  Nothing recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <AdminPagination
        page={page}
        total={total}
        hrefFor={(next) => auditHref({ ...params, page: next })}
      />
    </>
  );
}
