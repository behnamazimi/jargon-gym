import { localDateKey, studyTimezone } from "@/lib/trace/local-day";

export const SHIELD_DAYS = 7;

export type ShieldSummary = {
  /** A shield is banked, or is about to cover yesterday. */
  ready: boolean;
  /** Active days toward the next shield, 0 while one is banked. */
  progress: number;
  /** Yesterday was missed and the shield is covering it until today counts. */
  inUse: boolean;
  /** The covered day the member has not been told about yet. */
  noticeDate: string | null;
};

export type StreakSummary = {
  /** Days in a row, already 0 when a whole day was missed. */
  current: number;
  longest: number;
  /** True once something counted toward today. */
  doneToday: boolean;
  shield: ShieldSummary;
};

export const EMPTY_SHIELD: ShieldSummary = {
  ready: false,
  progress: 0,
  inUse: false,
  noticeDate: null,
};

export const EMPTY_STREAK: StreakSummary = {
  current: 0,
  longest: 0,
  doneToday: false,
  shield: EMPTY_SHIELD,
};

/** The stored streak only resets when the next activity is recorded
 *  (bump_streak), so a streak that ended days ago still holds its old
 *  number. This reads it as of `now`, on the same day boundary. */
export function streakSummary(
  row: {
    current_streak: number;
    longest_streak: number;
    last_active_date: string | null;
    timezone: string | null;
    shield_ready: boolean;
    shield_progress: number;
    shield_saved_date: string | null;
    shield_notice_pending: boolean;
  },
  now: Date = new Date(),
): StreakSummary {
  const today = localDateKey(now, studyTimezone(row.timezone));
  const doneToday = row.last_active_date === today;
  const inUse = row.shield_ready && row.last_active_date === previousDay(previousDay(today));
  const alive = doneToday || row.last_active_date === previousDay(today) || inUse;

  return {
    current: alive ? row.current_streak : 0,
    longest: row.longest_streak,
    doneToday,
    shield: {
      ready: alive && row.shield_ready,
      progress: alive ? row.shield_progress : 0,
      inUse,
      noticeDate: alive && row.shield_notice_pending ? row.shield_saved_date : null,
    },
  };
}

/** The summary once today has activity, the same step bump_streak takes. */
export function withTodayDone(streak: StreakSummary): StreakSummary {
  if (streak.doneToday) return streak;
  const current = streak.current + 1;
  return {
    current,
    longest: Math.max(streak.longest, current),
    doneToday: true,
    shield: shieldAfterToday(streak.shield),
  };
}

function shieldAfterToday(shield: ShieldSummary): ShieldSummary {
  if (shield.inUse) {
    return { ready: false, progress: 1, inUse: false, noticeDate: shield.noticeDate };
  }
  if (shield.ready) return shield;
  const progress = shield.progress + 1;
  if (progress >= SHIELD_DAYS) return { ...shield, ready: true, progress: 0 };
  return { ...shield, progress };
}

function previousDay(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
