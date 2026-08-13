"use client";

import type { DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
import { PickReasonBadges } from "@/components/jargon/pick-reason-badges";
import { StrengthBadge } from "@/components/jargon/strength-badge";
import type { PickContext } from "@/lib/smart-queue";

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const hours = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Streak is signed: positive = consecutive passes, negative = consecutive
 *  fails, 0 = never tested. Spelled out here instead of a raw signed number
 *  so the sign is not left to the reader to remember. */
function formatStreak(streak: number): string {
  if (streak === 0) return "no streak yet";
  const count = Math.abs(streak);
  if (streak > 0) return `${count} pass${count === 1 ? "" : "es"} in a row`;
  return `${count} fail${count === 1 ? "" : "s"} in a row`;
}

function formatReadDetail(count: number, lastAt: string | null): string {
  return count === 0 ? "read 0" : `read ${count} (${formatRelative(lastAt)})`;
}

/** A zero count means never tested in this context — streak, lifetime
 *  fails, and last-activity time are all trivially zero/null then, so the
 *  parenthetical is dropped instead of spelling out "never" redundantly. */
function formatTestDetail(
  label: string,
  count: number,
  streak: number,
  failCount: number,
  lastAt: string | null,
): string {
  if (count === 0) return `${label} 0`;
  const failsLabel = `${failCount} lifetime fail${failCount === 1 ? "" : "s"}`;
  return `${label} ${count} (${formatStreak(streak)}, ${failsLabel}, ${formatRelative(lastAt)})`;
}

export function ScoreRows({ rows, context }: { rows: DebugScoredRow[]; context: PickContext }) {
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

          <PickReasonBadges reasons={row.reasons} context={context} mode="full" />

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-base-content/50">
            <span>review</span>
            <StrengthBadge strength={row.reviewStrength} />
            <span>quiz</span>
            <StrengthBadge strength={row.quizStrength} />
          </div>

          <p className="m-0 min-w-0 break-words text-xs leading-relaxed text-base-content/50">
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
            {row.pendingReveal ? " · pending reveal" : ""}
            {row.lastFailAt ? (
              <>
                {" "}
                · last fail: {row.lastFailSource} ({formatRelative(row.lastFailAt)})
              </>
            ) : null}
          </p>
        </li>
      ))}
    </ul>
  );
}
