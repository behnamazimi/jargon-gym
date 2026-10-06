import type { ReactNode } from "react";
import type { QueueDebugTerm, QueueSection } from "@/lib/admin/queue-debug/build";
import { LocalTime } from "./local-time";

export const number = (value: number | null, digits = 3) =>
  value === null ? "—" : value.toFixed(digits);

export type Column<Row> = {
  label: string;
  cell: (row: Row) => ReactNode;
  /** Keeps the value on one line in the table. */
  nowrap?: boolean;
};

export type RowHead = { key: string; item: QueueDebugTerm; rank?: number; nextBatch?: boolean };

function NextBadge() {
  return <span className="badge badge-primary badge-sm">next</span>;
}

/** Phone: one card per term. From `md` up: a table. Both show the same columns. */
export function QueueList<Row>({
  rows,
  section,
  head,
  columns,
  empty,
}: {
  rows: Row[];
  section: QueueSection<unknown>;
  head: (row: Row) => RowHead;
  columns: Column<Row>[];
  empty: string;
}) {
  const hasRank = rows.some((row) => head(row).rank !== undefined);
  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 ? (
        <p className="m-0 rounded-lg border border-base-300 p-4 text-center text-base-content/50">
          {empty}
        </p>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
            {rows.map((row) => {
              const { key, item, rank, nextBatch } = head(row);
              return (
                <li key={key} className="flex flex-col gap-3 rounded-lg border border-base-300 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 break-words font-medium text-base-content">{item.term}</p>
                      <p className="m-0 truncate text-xs text-base-content/50">{item.domainName}</p>
                    </div>
                    {rank !== undefined ? (
                      <div className="flex shrink-0 items-center gap-2">
                        {nextBatch ? <NextBadge /> : null}
                        <span className="text-sm tabular-nums text-base-content/65">#{rank}</span>
                      </div>
                    ) : null}
                  </div>
                  <dl className="m-0 grid grid-cols-2 gap-2">
                    {columns.map((column) => (
                      <div
                        key={column.label}
                        className="min-w-0 rounded-md bg-base-200/50 px-2 py-1.5"
                      >
                        <dt className="text-xs text-base-content/65">{column.label}</dt>
                        <dd className="m-0 break-words text-sm text-base-content">
                          {column.cell(row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto rounded-lg border border-base-300 md:block">
            <table className="table">
              <thead>
                <tr>
                  {hasRank ? <th>#</th> : null}
                  <th>Term</th>
                  {columns.map((column) => (
                    <th key={column.label}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const { key, item, rank, nextBatch } = head(row);
                  return (
                    <tr key={key}>
                      {hasRank ? (
                        <td className="whitespace-nowrap">
                          {rank}
                          {nextBatch ? (
                            <span className="ml-2">
                              <NextBadge />
                            </span>
                          ) : null}
                        </td>
                      ) : null}
                      <td>
                        <p className="m-0 font-medium text-base-content">{item.term}</p>
                        <p className="m-0 text-xs text-base-content/50">{item.domainName}</p>
                      </td>
                      {columns.map((column) => (
                        <td
                          key={column.label}
                          className={column.nowrap ? "whitespace-nowrap" : undefined}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="m-0 text-sm text-base-content/65">
        Showing {rows.length} of {section.total}.
      </p>
    </div>
  );
}

export function When({ date, asOf }: { date: Date | null; asOf: Date }) {
  if (!date) return <span className="text-base-content/50">never</span>;
  return <LocalTime iso={date.toISOString()} asOfIso={asOf.toISOString()} />;
}

export function latest(dates: (Date | null)[]): Date | null {
  const present = dates.filter((d): d is Date => d !== null);
  return present.length === 0 ? null : new Date(Math.max(...present.map((d) => d.getTime())));
}
