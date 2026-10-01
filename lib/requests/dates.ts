/** "Fri 3 Oct", in the person's own time zone so the date matches their calendar. */
export function formatRequestDate(iso: string, timeZone: string | null | undefined): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
  try {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: timeZone || "UTC" }).format(
      date,
    );
  } catch {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(date);
  }
}
