import type { MasteryRow as MasteryRowData } from "@/lib/jargon/mastery";
import { OverallStrengthBars } from "@/components/jargon/overall-strength-bars";

type MasteryRowProps = {
  row: MasteryRowData;
};

export function MasteryRow({ row }: MasteryRowProps) {
  return (
    <li className="shadow-surface flex items-center justify-between gap-3 rounded-xl bg-base-100 px-4 py-3 ring-1 ring-base-content/5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium text-base-content">{row.term}</span>
          {row.known ? (
            <span className="text-xs text-base-content/40" aria-hidden>
              ✓
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-base-content/50">
          {row.domainName} · {row.category}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <OverallStrengthBars bars={row.bars} bucket={row.bucket} score={row.score} />
      </div>
    </li>
  );
}
