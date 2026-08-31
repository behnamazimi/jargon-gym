/** Local calendar-day helpers for "did you do this today" dashboard counts.
 *
 *  Runs on the server; "local" means STUDY_TIMEZONE below, not the
 *  request's browser offset.
 */

/** IANA timezone "today" is measured against for same-day dashboard counts. */
export const STUDY_TIMEZONE = "Europe/Amsterdam";

/** True when both instants fall on the same calendar date in `timeZone`. */
export function isSameLocalDay(a: Date, b: Date, timeZone: string): boolean {
  return localDateKey(a, timeZone) === localDateKey(b, timeZone);
}

/** YYYY-MM-DD in the given IANA timezone (en-CA formats that way). */
function localDateKey(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
