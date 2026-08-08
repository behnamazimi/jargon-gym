"use client";

import type { DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
import { PickReasonBadges } from "@/components/jargon/pick-reason-badges";

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const hours = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function ScoreRows({ rows }: { rows: DebugScoredRow[] }) {
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
            <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
              {row.score.toFixed(1)}
            </span>
          </div>

          <PickReasonBadges reasons={row.reasons} mode="full" />

          <p className="m-0 text-xs leading-relaxed text-base-content/50">
            seen {row.seenCount} · read {row.readCount} · review reveal {row.reviewRevealCount} ·
            recalled {row.recalledCount} · last{" "}
            <span className="font-medium">{row.lastOutcome}</span> ·{" "}
            {formatRelative(row.lastSeenAt)}
            {row.lastReviewRevealAt ? (
              <> · last reveal {formatRelative(row.lastReviewRevealAt)}</>
            ) : null}
            {row.lastRecalledOutcome ? (
              <>
                {" "}
                · recalled <span className="font-medium">{row.lastRecalledOutcome}</span> ·{" "}
                {formatRelative(row.lastRecalledAt)}
              </>
            ) : null}
            {row.failStreak > 0 ? ` · fail streak ${row.failStreak}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
