"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getTermEventHistoryAction,
  type DebugEventRow,
  type DebugScoredRow,
} from "@/app/(private)/jargon/debug/actions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { AttentionFlag, CrossTrackFlag } from "@/lib/trace";
import { cn } from "@/lib/utils";
import { TermTimeline } from "./term-timeline";
import {
  formatDaysUntil,
  formatMastery,
  formatPassFailDetail,
  formatPercent,
  formatQuizDetail,
  formatReadDetail,
  formatRecallDetail,
  formatRelative,
} from "./format";

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

function attentionTitle(flag: AttentionFlag): string {
  return `${flag.track}: recent pass rate ${formatPercent(flag.actual)} vs predicted ${formatPercent(flag.predicted)}, last ${flag.sampleSize} tests`;
}

function crossTrackTitle(flag: CrossTrackFlag): string {
  return `recall R=${formatPercent(flag.recallRetrievability)} vs recognition R=${formatPercent(flag.recognitionRetrievability)} (Δ${Math.round(flag.divergence * 100)}pt)`;
}

function ScoreRow({ row, index }: { row: DebugScoredRow; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [events, setEvents] = useState<DebugEventRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleExpandedChange(next: boolean) {
    setExpanded(next);
    if (!next || hasLoaded) return;

    setHasLoaded(true);
    startTransition(async () => {
      const result = await getTermEventHistoryAction(row.termId);
      if (result.error) {
        setLoadError(result.error);
      } else {
        setEvents(result.rows ?? []);
      }
    });
  }

  return (
    <li className="shadow-surface rounded-xl bg-base-100 px-4 py-3 ring-1 ring-base-content/5">
      <Collapsible isExpanded={expanded} onExpandedChange={handleExpandedChange}>
        <CollapsibleTrigger
          className="flex w-full items-start gap-2 border-0 bg-transparent p-0 text-left"
          aria-expanded={expanded}
          aria-label={`${row.term} — ${expanded ? "hide" : "show"} event history`}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                <span className="tabular-nums text-xs text-base-content/40">{index + 1}.</span>
                <span className="truncate text-sm font-medium text-base-content">{row.term}</span>
                <span className={`badge badge-sm font-normal ${LABEL_BADGE_CLASS[row.knownLabel]}`}>
                  {row.knownLabel}
                </span>
                {row.everMasteredAt ? (
                  <span className="text-2xs text-base-content/40">
                    mastered {formatRelative(row.everMasteredAt)}
                  </span>
                ) : null}
                {row.daysUntilEligible !== null ? (
                  <span className="text-2xs text-base-content/40">
                    eligible in {formatDaysUntil(row.daysUntilEligible)}
                  </span>
                ) : null}
                {row.attentionFlags.map((flag) => (
                  <span
                    key={flag.track}
                    className="badge badge-sm badge-error font-normal"
                    title={attentionTitle(flag)}
                  >
                    ⚠ {flag.track}
                  </span>
                ))}
                {row.crossTrackFlag ? (
                  <span
                    className="badge badge-sm badge-warning font-normal"
                    title={crossTrackTitle(row.crossTrackFlag)}
                  >
                    ⚠ cross-track
                  </span>
                ) : null}
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
              {[
                formatPassFailDetail("recall", row.recallPassFailCounts),
                formatPassFailDetail("recognition", row.recognitionPassFailCounts),
              ]
                .filter((detail): detail is string => detail !== null)
                .map((detail) => ` · ${detail}`)}
            </p>
          </div>

          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-base-content/40 transition-transform duration-200 ease-out motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
            aria-hidden
            strokeWidth={1.5}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          {hasLoaded ? (
            <div className="mt-3 border-t border-base-content/10 pt-2">
              {isPending ? (
                <p className="m-0 text-xs text-base-content/50">Loading history…</p>
              ) : loadError ? (
                <p className="m-0 text-xs text-error">{loadError}</p>
              ) : (
                <TermTimeline events={events} />
              )}
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

type SortOption = "rank" | "masteryDesc" | "masteryAsc" | "lastActivity";

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "rank", label: "Rank (default)" },
  { value: "masteryDesc", label: "Mastery, high to low" },
  { value: "masteryAsc", label: "Mastery, low to high" },
  { value: "lastActivity", label: "Last activity" },
];

function lastActivityMs(row: DebugScoredRow): number {
  return Math.max(
    row.lastReadAt ? new Date(row.lastReadAt).getTime() : 0,
    row.lastReviewRecallAt ? new Date(row.lastReviewRecallAt).getTime() : 0,
    row.lastQuizTestedAt ? new Date(row.lastQuizTestedAt).getTime() : 0,
  );
}

/** Rank is the server-ranked order already in `rows` — a no-op sort that
 *  just filters, so "reset to default" doesn't need its own code path. */
function filterAndSort(
  rows: DebugScoredRow[],
  query: string,
  sortBy: SortOption,
): DebugScoredRow[] {
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed ? rows.filter((row) => row.term.toLowerCase().includes(trimmed)) : rows;

  if (sortBy === "rank") return filtered;

  const sorted = [...filtered];
  if (sortBy === "masteryDesc") sorted.sort((a, b) => b.masteryAdjusted - a.masteryAdjusted);
  else if (sortBy === "masteryAsc") sorted.sort((a, b) => a.masteryAdjusted - b.masteryAdjusted);
  else if (sortBy === "lastActivity") sorted.sort((a, b) => lastActivityMs(b) - lastActivityMs(a));
  return sorted;
}

export function ScoreRows({ rows }: { rows: DebugScoredRow[] }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rank");
  const filteredRows = useMemo(() => filterAndSort(rows, query, sortBy), [rows, query, sortBy]);

  const [visibleCount, setVisibleCount] = useState(Math.min(BATCH_SIZE, filteredRows.length));

  // A new filter selection (context/collection), search query, or sort swaps
  // in a fresh row order — reset back to the first batch instead of carrying
  // over a stale count.
  useEffect(() => {
    setVisibleCount(Math.min(BATCH_SIZE, filteredRows.length));
  }, [filteredRows]);

  if (rows.length === 0) {
    return <p className="m-0 text-sm text-base-content/60">No terms match this selection.</p>;
  }

  const visibleRows = filteredRows.slice(0, visibleCount);
  const remaining = filteredRows.length - visibleRows.length;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search terms…"
          className="input input-sm max-w-xs"
          aria-label="Search terms"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
          className="select select-sm"
          aria-label="Sort terms"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {filteredRows.length === 0 ? (
        <p className="m-0 text-sm text-base-content/60">No terms match “{query}”.</p>
      ) : (
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
              onClick={() =>
                setVisibleCount((count) => Math.min(count + BATCH_SIZE, filteredRows.length))
              }
            >
              Show {Math.min(remaining, BATCH_SIZE)} more ({remaining} left)
            </button>
          ) : null}
        </>
      )}
    </>
  );
}
