import type { DebugStrengthRow } from "@/app/(private)/jargon/debug/actions";
import { OverallStrengthBars } from "@/components/jargon/overall-strength-bars";
import { formatReadDetail, formatRelative, formatTestDetail } from "./format";

export function StrengthRows({ rows }: { rows: DebugStrengthRow[] }) {
  if (rows.length === 0) {
    return <p className="m-0 text-sm text-base-content/60">No terms match this selection.</p>;
  }

  return (
    <ul className="m-0 list-none space-y-3 p-0">
      {rows.map((row, index) => (
        <li
          key={row.termId}
          className="shadow-surface space-y-2 rounded-xl bg-base-100 px-4 py-3 ring-1 ring-base-content/5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="tabular-nums text-xs text-base-content/40">{index + 1}.</span>
              <span className="truncate text-sm font-medium text-base-content">{row.term}</span>
            </div>
            <span className="flex shrink-0 items-center gap-2">
              <OverallStrengthBars bars={row.bars} bucket={row.bucket} score={row.score} />
              <span className="text-sm font-semibold tabular-nums text-primary">{row.score}</span>
            </span>
          </div>

          <p className="m-0 min-w-0 break-words text-xs leading-relaxed text-base-content/50">
            {row.knownAt ? `known (${formatRelative(row.knownAt)})` : "unknown"} ·{" "}
            {formatReadDetail(row.readCount, row.lastReadAt)} ·{" "}
            {formatTestDetail(
              "review recall",
              row.reviewRecallCount,
              row.reviewStreak,
              row.reviewFailCount,
              row.lastReviewRecallAt,
            )}{" "}
            ·{" "}
            {formatTestDetail(
              "quiz",
              row.quizTestCount,
              row.quizStreak,
              row.quizFailCount,
              row.lastQuizTestedAt,
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
