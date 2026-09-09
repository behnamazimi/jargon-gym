import type { DebugScoredRow } from "@/app/(private)/jargon/debug/actions";

export type SortOption = "rank" | "masteryDesc" | "masteryAsc" | "lastActivity";

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
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
export function filterAndSort(
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
