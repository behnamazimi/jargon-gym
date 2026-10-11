import { localDateKey, studyTimezone } from "@/lib/trace/local-day";

export type StreakSummary = {
  /** Days in a row, already 0 when a whole day was missed. */
  current: number;
  longest: number;
  /** True once something counted toward today. */
  doneToday: boolean;
};

export const EMPTY_STREAK: StreakSummary = { current: 0, longest: 0, doneToday: false };

/** The stored streak only resets when the next activity is recorded
 *  (bump_streak), so a streak that ended days ago still holds its old
 *  number. This reads it as of `now`, on the same day boundary. */
export function streakSummary(
  row: {
    current_streak: number;
    longest_streak: number;
    last_active_date: string | null;
    timezone: string | null;
  },
  now: Date = new Date(),
): StreakSummary {
  const today = localDateKey(now, studyTimezone(row.timezone));
  const doneToday = row.last_active_date === today;
  const alive = doneToday || row.last_active_date === previousDay(today);

  return {
    current: alive ? row.current_streak : 0,
    longest: row.longest_streak,
    doneToday,
  };
}

/** The summary once today has activity, the same step bump_streak takes. */
export function withTodayDone(streak: StreakSummary): StreakSummary {
  if (streak.doneToday) return streak;
  const current = streak.current + 1;
  return { current, longest: Math.max(streak.longest, current), doneToday: true };
}

function previousDay(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
