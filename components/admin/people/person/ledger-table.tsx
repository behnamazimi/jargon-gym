import { formatAdminDateTime } from "@/lib/admin/format";
import type { PersonLedgerRow } from "@/lib/admin/people/person";

const KIND_LABEL: Record<PersonLedgerRow["kind"], string> = {
  spend: "Used",
  refund: "Refunded",
  grant: "Granted",
  reset: "Usage reset",
};

function amountText(row: PersonLedgerRow): string {
  if (row.kind === "reset") return "—";
  return `${row.kind === "spend" ? "−" : "+"}${row.amount}`;
}

export function LedgerTable({ rows }: { rows: PersonLedgerRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="table">
        <thead>
          <tr>
            <th>When</th>
            <th>What</th>
            <th className="text-right">Credits</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap text-base-content/65">
                {formatAdminDateTime(row.createdAt)}
              </td>
              <td>
                {KIND_LABEL[row.kind]}
                {row.feature ? (
                  <span className="text-base-content/50"> · {row.feature}</span>
                ) : null}
              </td>
              <td className="text-right tabular-nums">{amountText(row)}</td>
              <td className="text-base-content/65">{row.note ?? ""}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center text-base-content/50">
                No credit activity yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
