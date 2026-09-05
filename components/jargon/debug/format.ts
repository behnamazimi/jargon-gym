import { AGAIN, EASY, GOOD, HARD, type TraceEventName } from "@/lib/trace";

export function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const hours = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Minute-granular sibling of formatRelative — the hour-granularity above
 *  is too coarse for the timeline/abandonment worklist, where gaps on the
 *  order of minutes (the abandonment window itself is 10) are the point. */
export function formatRelativeMinutes(iso: string | null): string {
  if (!iso) return "never";
  const minutes = (Date.now() - new Date(iso).getTime()) / (1000 * 60);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.round(minutes)}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / (60 * 24))}d ago`;
}

export function formatReadDetail(count: number, lastAt: string | null): string {
  return count === 0 ? "read 0" : `read ${count} (${formatRelative(lastAt)})`;
}

/** Read ranking's score breakdown — always shown alongside formatReadDetail,
 *  same "stays accurate regardless of tab" convention as the other
 *  formatters here. Distinct from formatReadDetail, which shows raw
 *  readCount/lastReadAt state; this shows the derived ranking signal. */
export function formatReadRankDetail(exposure: number, tempering: number, score: number): string {
  return `score ${score.toFixed(3)} (exposure ${exposure.toFixed(3)}, temper ${tempering.toFixed(3)})`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** A zero count means never tested in this track — stability/difficulty/
 *  retrievability are all null then, so the parenthetical is dropped
 *  instead of spelling out "never" redundantly. */
export function formatRecallDetail(
  count: number,
  stability: number | null,
  difficulty: number | null,
  retrievability: number | null,
  lastAt: string | null,
): string {
  if (count === 0 || stability === null) return "review 0";
  return `review ${count} (S=${stability.toFixed(1)}, D=${difficulty?.toFixed(1) ?? "—"}, R=${formatPercent(retrievability ?? 0)}, ${formatRelative(lastAt)})`;
}

export function formatQuizDetail(
  count: number,
  posterior: number | null,
  retrievability: number | null,
  lastAt: string | null,
): string {
  if (count === 0 || posterior === null) return "quiz 0";
  return `quiz ${count} (p=${formatPercent(posterior)}, R=${formatPercent(retrievability ?? 0)}, ${formatRelative(lastAt)})`;
}

export function formatMastery(mastery: number, masteryAdjusted: number): string {
  return `mastery ${formatPercent(mastery)} (adj ${formatPercent(masteryAdjusted)})`;
}

/** A term with no history in this track yet (0/0) is dropped rather than
 *  printed as "0/0 pass" — that's the same "review 0"/"quiz 0" convention
 *  formatRecallDetail/formatQuizDetail already use for an untested track. */
export function formatPassFailDetail(
  label: string,
  counts: { passes: number; fails: number },
): string | null {
  const total = counts.passes + counts.fails;
  if (total === 0) return null;
  return `${label} ${counts.passes}/${total} pass`;
}

export function formatDaysUntil(days: number): string {
  if (days <= 0) return "now";
  const hours = days * 24;
  if (hours < 1) return "< 1h";
  if (hours < 24) return `~${Math.round(hours)}h`;
  return `~${Math.round(days)}d`;
}

export const GRADE_LABELS: Record<number, string> = {
  [AGAIN]: "Again",
  [HARD]: "Hard",
  [GOOD]: "Good",
  [EASY]: "Easy",
};

function formatGradeLabel(grade: number | null): string {
  if (grade === null) return "—";
  return GRADE_LABELS[grade] ?? String(grade);
}

/** One line per review_events row, timeline order — the same
 *  "label (numbers, relative time)" shape as the other formatters in this
 *  file, applied to a single logged event instead of a live snapshot. */
export function formatEventLine(row: {
  event: TraceEventName;
  grade: number | null;
  questionType: string | null;
  retrievabilityBefore: number | null;
  createdAt: string;
}): string {
  const when = formatRelativeMinutes(row.createdAt);
  const before = row.retrievabilityBefore === null ? "—" : formatPercent(row.retrievabilityBefore);

  switch (row.event) {
    case "read":
      return `read · ${when}`;
    case "reveal":
      return `reveal · ${when}`;
    case "review_pass":
      return `review pass · grade ${formatGradeLabel(row.grade)} · R_before=${before} · ${when}`;
    case "review_fail":
      return `review fail · grade ${formatGradeLabel(row.grade)} · R_before=${before} · ${when}`;
    case "quiz_pass":
      return `quiz pass · ${row.questionType ?? "—"} · R_before=${before} · ${when}`;
    case "quiz_fail":
      return `quiz fail · ${row.questionType ?? "—"} · R_before=${before} · ${when}`;
    default:
      return `${row.event} · ${when}`;
  }
}
