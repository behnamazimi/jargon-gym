import type { MasteryCollectionRow } from "@/lib/jargon/mastery";

type MasteryRowProps = {
  row: MasteryCollectionRow;
};

export function MasteryRow({ row }: MasteryRowProps) {
  return (
    <li className="shadow-surface flex items-center justify-between gap-3 rounded-xl bg-base-100 px-4 py-3 ring-1 ring-base-content/5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate font-medium text-base-content">{row.domainName}</span>
          <span className="shrink-0 tabular-nums text-base-content/60">
            {row.knownCount}/{row.totalCount} known ({row.percentage}%)
          </span>
        </div>
        <progress
          className="progress progress-primary mt-1.5 h-1.5 w-full"
          value={row.percentage}
          max={100}
          aria-label={`${row.domainName} known ${row.percentage}%`}
        />
      </div>
    </li>
  );
}
