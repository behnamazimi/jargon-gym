import Link from "next/link";
import { describeAudit } from "@/lib/admin/audit-labels";
import type { AuditRow } from "@/lib/admin/audit-query";
import { formatAdminDateTime } from "@/lib/admin/format";

export function HistoryList({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return <p className="m-0 text-sm text-base-content/50">Nothing recorded for this person.</p>;
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.map((row) => {
        const { label, summary } = describeAudit(row.action, row.details);
        return (
          <li key={row.id} className="rounded-lg border border-base-300 px-3 py-2">
            <p className="m-0 text-sm font-medium text-base-content">{label}</p>
            {summary ? <p className="m-0 text-sm text-base-content/65">{summary}</p> : null}
            <p className="m-0 text-xs text-base-content/50">
              {formatAdminDateTime(row.createdAt)}
              {row.actorEmail ? ` · ${row.actorEmail}` : ""}
            </p>
          </li>
        );
      })}
      <li>
        <Link href="/admin/system/audit" className="link text-sm">
          Full audit log
        </Link>
      </li>
    </ul>
  );
}
