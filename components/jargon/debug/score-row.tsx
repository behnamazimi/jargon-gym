import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
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
  formatReadRankDetail,
  formatRecallDetail,
  formatRelative,
} from "./format";

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

export function ScoreRow({ row, index }: { row: DebugScoredRow; index: number }) {
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
    <li className="-mx-2 rounded-lg transition-colors hover:bg-base-200/50">
      <Collapsible isExpanded={expanded} onExpandedChange={handleExpandedChange}>
        <CollapsibleTrigger
          className="flex w-full items-start gap-2 border-0 bg-transparent px-2 py-3 text-left"
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
              {formatReadRankDetail(row.readExposure, row.readTempering, row.readRankScore)} ·{" "}
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
            <div className="border-t border-base-content/10 px-2 pt-2 pb-3">
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
