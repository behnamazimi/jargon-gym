function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const hours = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatReadDetail(count: number, lastAt: string | null): string {
  return count === 0 ? "read 0" : `read ${count} (${formatRelative(lastAt)})`;
}

function formatPercent(value: number): string {
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
