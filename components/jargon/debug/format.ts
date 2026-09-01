import { AGAIN, EASY, GOOD, HARD, type TraceEventName } from "@/lib/trace";

function formatRelative(iso: string | null): string {
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

const GRADE_LABELS: Record<number, string> = {
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
