import { formatAdminDate } from "@/lib/admin/format";
import type { AiCreditUsageRow } from "@/lib/ai-credits/admin";

function RowActions({
  row,
  isPending,
  onGrant,
  onReset,
  className,
}: {
  row: AiCreditUsageRow;
  isPending: boolean;
  onGrant: (email: string) => void;
  onReset: (row: AiCreditUsageRow) => void;
  className: string;
}) {
  return (
    <>
      <button
        type="button"
        className={`btn btn-outline transition-transform active:scale-[0.96] ${className}`}
        onClick={() => onGrant(row.email)}
      >
        Grant
      </button>
      <button
        type="button"
        className={`btn btn-outline transition-transform active:scale-[0.96] ${className}`}
        disabled={isPending}
        onClick={() => onReset(row)}
      >
        Reset
      </button>
    </>
  );
}

export function UsageCards({
  usage,
  isPending,
  onGrant,
  onReset,
}: {
  usage: AiCreditUsageRow[];
  isPending: boolean;
  onGrant: (email: string) => void;
  onReset: (row: AiCreditUsageRow) => void;
}) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
      {usage.map((row) => (
        <li key={row.userId} className="flex flex-col gap-3 rounded-lg border border-base-300 p-3">
          <div className="min-w-0">
            <p className="m-0 truncate font-medium text-base-content">{row.email}</p>
            <p className="m-0 text-xs text-base-content/50">
              Last activity {formatAdminDate(row.lastActivity)}
            </p>
          </div>
          <dl className="m-0 grid grid-cols-3 gap-2 text-center">
            {[
              ["Used", row.spent],
              ["Granted", row.granted],
              ["Left", row.remaining],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-base-200/50 px-2 py-1.5">
                <dd className="m-0 text-base font-semibold tabular-nums text-base-content">
                  {value}
                </dd>
                <dt className="text-xs text-base-content/65">{label}</dt>
              </div>
            ))}
          </dl>
          <div className="grid grid-cols-2 gap-2">
            <RowActions
              row={row}
              isPending={isPending}
              onGrant={onGrant}
              onReset={onReset}
              className="min-h-11"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function UsageTable({
  usage,
  isPending,
  onGrant,
  onReset,
}: {
  usage: AiCreditUsageRow[];
  isPending: boolean;
  onGrant: (email: string) => void;
  onReset: (row: AiCreditUsageRow) => void;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-base-300 md:block">
      <table className="table">
        <thead>
          <tr>
            <th>Person</th>
            <th className="text-right">Used</th>
            <th className="text-right">Granted</th>
            <th className="text-right">Left</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usage.map((row) => (
            <tr key={row.userId}>
              <td>
                <p className="m-0 font-medium text-base-content">{row.email}</p>
                <p className="m-0 text-xs text-base-content/50">
                  Last activity {formatAdminDate(row.lastActivity)}
                </p>
              </td>
              <td className="text-right tabular-nums">{row.spent}</td>
              <td className="text-right tabular-nums">{row.granted}</td>
              <td className="text-right tabular-nums">{row.remaining}</td>
              <td className="whitespace-nowrap text-right">
                <div className="flex justify-end gap-2">
                  <RowActions
                    row={row}
                    isPending={isPending}
                    onGrant={onGrant}
                    onReset={onReset}
                    className="btn-sm"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
