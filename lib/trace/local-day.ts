/** Local calendar-day helpers for "did you do this today" dashboard counts,
 *  and for FSRS-5's same-day re-review branch (§4).
 *  Runs on the server; "local" means STUDY_TIMEZONE below, not the
 *  request's browser offset.
 *
 *  Carried over from lib/smart-queue/local-day.ts as-is. */
export const STUDY_TIMEZONE = "Europe/Amsterdam";

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
