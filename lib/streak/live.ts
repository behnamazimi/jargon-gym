import { localDateKey, studyTimezone } from "@/lib/trace/local-day";

/** The streak as it stands right now. The stored count only changes when the
 *  person studies, so after a missed day it still holds the old number until
 *  the next activity resets it. Today and yesterday keep the streak alive. */
export function liveStreak(
  storedStreak: number,
  lastActiveDate: string | null,
  timezone: string | null,
  now: Date = new Date(),
): number {
  if (!lastActiveDate) return 0;

  const today = localDateKey(now, studyTimezone(timezone));
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  return lastActiveDate >= yesterday.toISOString().slice(0, 10) ? storedStreak : 0;
}
