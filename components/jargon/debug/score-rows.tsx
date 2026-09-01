"use client";

import { useEffect, useState } from "react";
import type { DebugScoredRow } from "@/app/(private)/jargon/debug/actions";
import { formatMastery, formatQuizDetail, formatReadDetail, formatRecallDetail } from "./format";

/** Debug intentionally shows every scored candidate, unsliced — but
 *  mounting hundreds of these rows (each with badges + formatted detail
 *  text) in one synchronous commit can block the main thread long enough to
 *  feel like the page froze, especially on a client-side transition where
 *  there's no browser loading indicator to signal it's still working.
 *  Rendering in batches keeps each commit small while still surfacing the
 *  full list. */
const BATCH_SIZE = 100;

const LABEL_BADGE_CLASS: Record<DebugScoredRow["knownLabel"], string> = {
  known: "badge-success",
  learning: "badge-warning",
  unknown: "badge-ghost",
};

function ScoreRow({ row, index }: { row: DebugScoredRow; index: number }) {
  return (
    <li className="shadow-surface space-y-2 rounded-xl bg-base-100 px-4 py-3 ring-1 ring-base-content/5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="tabular-nums text-xs text-base-content/40">{index + 1}.</span>
          <span className="truncate text-sm font-medium text-base-content">{row.term}</span>
          <span className={`badge badge-sm font-normal ${LABEL_BADGE_CLASS[row.knownLabel]}`}>
            {row.knownLabel}
          </span>
        </div>
      </div>

      <p className="m-0 min-w-0 break-words text-xs leading-relaxed text-base-content/50">
        {formatReadDetail(row.readCount, row.lastReadAt)} ·{" "}
        {formatRecallDetail(
          row.reviewRecallCount,
          row.recallStability,
          row.recallDifficulty,
          row.recallRetrievability,
          row.lastReviewRecallAt,
        )}{" "}
        ·{" "}
        {formatQuizDetail(
          row.quizTestCount,
          row.quizKnowledgePosterior,
          row.recognitionRetrievability,
          row.lastQuizTestedAt,
        )}{" "}
        · {formatMastery(row.mastery, row.masteryAdjusted)}
      </p>
    </li>
  );
}

export function ScoreRows({ rows }: { rows: DebugScoredRow[] }) {
  const [visibleCount, setVisibleCount] = useState(Math.min(BATCH_SIZE, rows.length));

  // New filter selection (context/collection) swaps in a fresh `rows` array —
  // reset back to the first batch instead of carrying over a stale count.
  useEffect(() => {
    setVisibleCount(Math.min(BATCH_SIZE, rows.length));
  }, [rows]);

  if (rows.length === 0) {
    return <p className="m-0 text-sm text-base-content/60">No terms match this selection.</p>;
  }

  const visibleRows = rows.slice(0, visibleCount);
  const remaining = rows.length - visibleRows.length;

  return (
    <>
      <ul className="m-0 list-none space-y-3 p-0">
        {visibleRows.map((row, index) => (
          <ScoreRow key={row.termId} row={row} index={index} />
        ))}
      </ul>
      {remaining > 0 ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-3"
          onClick={() => setVisibleCount((count) => Math.min(count + BATCH_SIZE, rows.length))}
        >
          Show {Math.min(remaining, BATCH_SIZE)} more ({remaining} left)
        </button>
      ) : null}
    </>
  );
}
