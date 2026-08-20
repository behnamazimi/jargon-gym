export function formatRelative(iso: string | null): string {
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

export function formatReadDetail(count: number, lastAt: string | null): string {
  return count === 0 ? "read 0" : `read ${count} (${formatRelative(lastAt)})`;
}

/** A zero count means never tested in this context — streak, lifetime
 *  fails, and last-activity time are all trivially zero/null then, so the
 *  parenthetical is dropped instead of spelling out "never" redundantly. */
export function formatTestDetail(
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
