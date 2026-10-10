/** Local calendar-day helpers for "did you do this today" dashboard counts.
 *  Runs on the server, so "local" is the person's saved timezone
 *  (user_settings.timezone, the same one their streak uses), or
 *  STUDY_TIMEZONE when none is saved yet. */

/** Fallback for people with no saved timezone, e.g. Telegram-only users.
 *  bump_streak() and get_streak_history() use the same literal in SQL. */
export const STUDY_TIMEZONE = "Europe/Amsterdam";

/** The person's saved timezone if it's one the runtime knows, else STUDY_TIMEZONE. */
export function studyTimezone(saved: string | null | undefined): string {
  return saved && isKnownTimeZone(saved) ? saved : STUDY_TIMEZONE;
}

/** Intl throws on a timezone it doesn't know. The saved value comes from the
 *  browser, so check it before the day math relies on it. */
function isKnownTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isSameLocalDay(a: Date, b: Date, timeZone: string): boolean {
  return localDateKey(a, timeZone) === localDateKey(b, timeZone);
}

function localDateKey(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
